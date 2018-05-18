const _ = require('lodash');
const {
  getAuthorizedFields,
  hasPermission,
  authIsDisabled,
  sanitizeDocumentList,
  getUpdatePaths,
} = require('./lib/helpers');

const PermissionDeniedError = require('./lib/PermissionDeniedError');

module.exports = (schema) => {
  function save(doc, options, next) {
    if (doc.isNew && !hasPermission(schema, options, 'create', doc)) {
      return next(new PermissionDeniedError('create'));
    }

    const authorizedFields = getAuthorizedFields(schema, options, 'write', doc);
    const modifiedPaths = doc.modifiedPaths();
    const discrepancies = _.difference(modifiedPaths, authorizedFields);

    if (discrepancies.length > 0) {
      return next(new PermissionDeniedError('write', discrepancies));
    }

    return next();
  }

  function removeQuery(query, next) {
    if (!hasPermission(schema, query.options, 'remove')) {
      return next(new PermissionDeniedError('remove'));
    }

    return next();
  }

  function removeDoc(doc, options, next) {
    if (!hasPermission(schema, options, 'remove', doc)) {
      return next(new PermissionDeniedError('remove'));
    }

    return next();
  }

  function find(query, docs, next) {
    const docList = _.castArray(docs);
    const multi = _.isArrayLike(docList);

    const sanitizedResult = sanitizeDocumentList(schema, query.options, docs);

    return next(null, multi ? sanitizedResult : sanitizedResult[0]);
  }

  function update(query, next) {
    // If this is an upsert, you'll need the create permission
    // TODO add some tests for the upset case
    if (
      query.options
      && query.options.upsert
      && !hasPermission(schema, query.options, 'create')
    ) {
      return next(new PermissionDeniedError('create'));
    }

    const authorizedFields = getAuthorizedFields(schema, query.options, 'write');

    // check to see if the group is trying to update a field it does not have permission to
    const modifiedPaths = getUpdatePaths(query._update);
    const discrepancies = _.difference(modifiedPaths, authorizedFields);
    if (discrepancies.length > 0) {
      return next(new PermissionDeniedError('write', discrepancies));
    }

    // TODO handle the overwrite option
    // TODO handle Model.updateMany

    // Detect which fields can be returned if 'new: true' is set
    const authorizedReturnFields = getAuthorizedFields(schema, query.options, 'read');

    // create a sanitizedReturnFields object that will be used to return only the fields that a
    // group has access to read
    const sanitizedReturnFields = {};
    authorizedReturnFields.forEach((field) => {
      if (!query._fields || query._fields[field]) {
        sanitizedReturnFields[field] = 1;
      }
    });
    query._fields = sanitizedReturnFields;

    return next();
  }

  // Find paths with permissioned schemas and store those so deep checks can be done
  // on the right paths at call time.
  schema.pathsWithPermissionedSchemas = {};
  schema.eachPath((path, schemaType) => {
    const subSchema = schemaType.schema;
    if (subSchema && subSchema.permissions) {
      schema.pathsWithPermissionedSchemas[path] = subSchema;
    }
  });

  schema.pre('findOneAndRemove', function preFindOneAndRemove(next) {
    if (authIsDisabled(this.options)) { return next(); }
    return removeQuery(this, next);
  });
  // TODO, WTF, how to prevent someone from Model.find().remove().exec(); That doesn't
  // fire any remove hooks. Does it fire a find hook?
  schema.pre('remove', function preRemove(next, options) {
    if (authIsDisabled(options)) { return next(); }
    return removeDoc(this, options, next);
  });
  schema.pre('save', function preSave(next, options) {
    if (authIsDisabled(options)) { return next(); }
    return save(this, options, next);
  });
  schema.post('find', function postFind(doc, next) {
    if (authIsDisabled(this.options)) { return next(); }
    return find(this, doc, next);
  });
  schema.post('findOne', function postFindOne(doc, next) {
    if (authIsDisabled(this.options)) { return next(); }
    return find(this, doc, next);
  });
  schema.pre('update', function preUpdate(next) {
    if (authIsDisabled(this.options)) { return next(); }
    return update(this, next);
  });
  schema.pre('findOneAndUpdate', function preFindOneAndUpdate(next) {
    if (authIsDisabled(this.options)) { return next(); }
    return update(this, next);
  });

  schema.query.setAuthLevel = function setAuthLevel(authLevel) {
    this.options.authLevel = authLevel;
    return this;
  };

  schema.statics.canCreate = function canCreate(options) {
    return hasPermission(this.schema, options, 'create');
  };
};
