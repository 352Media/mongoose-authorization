const _ = require('lodash');
const {
  getAuthorizedFields,
  hasPermission,
} = require('./lib/helpers');

const PermissionDeniedError = require('./lib/PermissionDeniedError');

// TODO implement a pluginOption for putting the permissions into the results object for
// find queries
module.exports = (schema) => {
  let authorizationEnabled = true;

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
    const multi = docList.length;

    const processedResult = _.map(docList, (doc) => {
      const authorizedFields = getAuthorizedFields(schema, query.options, 'read', doc);

      if (getAuthorizedFields.length === 0) {
        return;
      }

      // Check to see if group has the permission to see the fields that came back. Fields
      // that don't will be removed.
      const realDoc = doc._doc ? doc._doc : doc;
      const discrepancies = _.difference(Object.keys(realDoc), authorizedFields);
      for (const field of discrepancies) {
        delete realDoc[field];
      }

      if (_.isEmpty(realDoc)) {
        return;
      }

      return doc;
    });

    const filteredResult = _.filter(processedResult);

    return next(null, multi ? filteredResult : filteredResult[0]);
  }

  function update(query, next) {
    // If this is an upsert, you'll need the create permission
    if (
      query.options
      && query.options.upsert
      && !hasPermission(schema, query.options, 'create')
    ) {
      return next(new PermissionDeniedError('create'));
    }

    const authorizedFields = getAuthorizedFields(schema, query.options, 'write');

    // create an update object that has been sanitized based on permissions
    const sanitizedUpdate = {};
    authorizedFields.forEach((field) => {
      sanitizedUpdate[field] = query._update[field];
    });

    // check to see if the group is trying to update a field it does not have permission to
    const discrepancies = _.difference(Object.keys(query._update), Object.keys(sanitizedUpdate));
    if (discrepancies.length > 0) {
      return next(new PermissionDeniedError('write', discrepancies));
    }
    query._update = sanitizedUpdate;

    // TODO, see if this section works at all. Seems off that the `_fields` property is the
    // thing that determines what fields come back
    // Detect which fields can be returned if 'new: true' is set
    const authorizedReturnFields = getAuthorizedFields(schema, query.options, 'read');

    // create a sanitizedReturnFields object that will be used to return only the fields that a
    // group has access to read
    const sanitizedReturnFields = {};
    for (const field of authorizedReturnFields) {
      if (!query._fields || query._fields[field]) {
        sanitizedReturnFields[field] = 1;
      }
    }
    query._fields = sanitizedReturnFields;

    return next();
  }

  schema.pre('findOneAndRemove', function preFindOneAndRemove(next) {
    if (!authorizationEnabled) { return next(); }
    return removeQuery(this, next);
  });
  // TODO, WTF, how to prevent someone from Model.find().remove().exec(); That doesn't
  // fire any remove hooks. Does it fire a find hook?
  schema.pre('remove', function preRemove(next, options) {
    if (!authorizationEnabled) { return next(); }
    return removeDoc(this, options, next);
  });
  schema.pre('save', function preSave(next, options) {
    if (!authorizationEnabled) { return next(); }
    return save(this, options, next);
  });
  schema.post('find', function postFind(doc, next) {
    if (!authorizationEnabled) { return next(); }
    return find(this, doc, next);
  });
  schema.post('findOne', function postFindOne(doc, next) {
    if (!authorizationEnabled) { return next(); }
    return find(this, doc, next);
  });
  schema.pre('update', function preUpdate(next) {
    if (!authorizationEnabled) { return next(); }
    return update(this, next);
  });
  schema.pre('findOneAndUpdate', function preFindOneAndUpdate(next) {
    if (!authorizationEnabled) { return next(); }
    return update(this, next);
  });

  schema.query.setAuthLevel = function setAuthLevel(authLevel) {
    this.options.authLevel = authLevel;
    return this;
  };

  schema.static('disableAuthorization', () => {
    authorizationEnabled = false;
  });

  schema.static('enableAuthorization', () => {
    authorizationEnabled = true;
  });
};
