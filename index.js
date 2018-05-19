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
  async function save(doc, options, next) {
    if (doc.isNew && !await hasPermission(schema, options, 'create', doc)) {
      next(new PermissionDeniedError('create'));
      return;
    }

    const authorizedFields = await getAuthorizedFields(schema, options, 'write', doc);
    const modifiedPaths = doc.modifiedPaths();
    const discrepancies = _.difference(modifiedPaths, authorizedFields);

    if (discrepancies.length > 0) {
      next(new PermissionDeniedError('write', discrepancies));
      return;
    }

    next();
  }

  async function removeQuery(query, next) {
    if (!await hasPermission(schema, query.options, 'remove')) {
      next(new PermissionDeniedError('remove'));
      return;
    }

    next();
    return;
  }

  async function removeDoc(doc, options, next) {
    if (!await hasPermission(schema, options, 'remove', doc)) {
      next(new PermissionDeniedError('remove'));
      return;
    }

    next();
    return;
  }

  async function find(query, docs, next) {
    const sanitizedResult = await sanitizeDocumentList(schema, query.options, docs);

    next(null, sanitizedResult);
  }

  async function update(query, next) {
    // If this is an upsert, you'll need the create permission
    // TODO add some tests for the upset case
    if (
      query.options
      && query.options.upsert
      && !await hasPermission(schema, query.options, 'create')
    ) {
      next(new PermissionDeniedError('create'));
      return;
    }

    const authorizedFields = await getAuthorizedFields(schema, query.options, 'write');

    // check to see if the group is trying to update a field it does not have permission to
    const modifiedPaths = getUpdatePaths(query._update);
    const discrepancies = _.difference(modifiedPaths, authorizedFields);
    if (discrepancies.length > 0) {
      next(new PermissionDeniedError('write', discrepancies));
      return;
    }

    // TODO handle the overwrite option
    // TODO handle Model.updateMany

    // Detect which fields can be returned if 'new: true' is set
    const authorizedReturnFields = await getAuthorizedFields(schema, query.options, 'read');

    // create a sanitizedReturnFields object that will be used to return only the fields that a
    // group has access to read
    const sanitizedReturnFields = {};
    authorizedReturnFields.forEach((field) => {
      if (!query._fields || query._fields[field]) {
        sanitizedReturnFields[field] = 1;
      }
    });
    query._fields = sanitizedReturnFields;

    next();
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
    if (authIsDisabled(this.options)) { next(); return; }
    removeQuery(this, next);
  });
  // TODO, WTF, how to prevent someone from Model.find().remove().exec(); That doesn't
  // fire any remove hooks. Does it fire a find hook?
  schema.pre('remove', function preRemove(next, options) {
    if (authIsDisabled(options)) { next(); return; }
    removeDoc(this, options, next);
  });
  schema.pre('save', function preSave(next, options) {
    if (authIsDisabled(options)) { next(); return; }
    save(this, options, next);
  });
  schema.post('find', function postFind(doc, next) {
    if (authIsDisabled(this.options)) { next(); return; }
    find(this, doc, next);
  });
  schema.post('findOne', function postFindOne(doc, next) {
    if (authIsDisabled(this.options)) { next(); return; }
    find(this, doc, next);
  });
  schema.pre('update', function preUpdate(next) {
    if (authIsDisabled(this.options)) { next(); return; }
    update(this, next);
  });
  schema.pre('findOneAndUpdate', function preFindOneAndUpdate(next) {
    if (authIsDisabled(this.options)) { next(); return; }
    update(this, next);
  });

  schema.query.setAuthLevel = function setAuthLevel(authLevel) {
    this.options.authLevel = authLevel;
    return this;
  };

  schema.statics.canCreate = async function canCreate(options) {
    return await hasPermission(this.schema, options, 'create');
  };
};
