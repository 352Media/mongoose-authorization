const _ = require('lodash');
const {
  resolveAuthLevel,
  getAuthorizedFields,
  hasPermission,
  authIsDisabled,
  sanitizeDocumentList,
  getUpdatePaths,
} = require('./lib/helpers');

const PermissionDeniedError = require('./lib/PermissionDeniedError');

module.exports = (schema) => {
  async function save(doc, options) {
    const authLevels = await resolveAuthLevel(schema, options, doc);
    if (doc.isNew && !hasPermission(schema, authLevels, 'create')) {
      throw new PermissionDeniedError('create');
    }

    const authorizedFields = getAuthorizedFields(schema, authLevels, 'write');
    const modifiedPaths = doc.modifiedPaths();
    const discrepancies = _.difference(modifiedPaths, authorizedFields);

    if (discrepancies.length > 0) {
      throw new PermissionDeniedError('write', discrepancies);
    }
  }

  async function removeQuery(query) {
    const authLevels = await resolveAuthLevel(schema, query.options);
    if (!hasPermission(schema, authLevels, 'remove')) {
      throw new PermissionDeniedError('remove');
    }
  }

  async function removeDoc(doc, options) {
    const authLevels = await resolveAuthLevel(schema, options, doc);
    if (!hasPermission(schema, authLevels, 'remove')) {
      throw new PermissionDeniedError('remove');
    }
  }

  async function find(query, docs) {
    return sanitizeDocumentList(schema, query.options, docs);
  }

  async function update(query) {
    const authLevels = await resolveAuthLevel(schema, query.options);
    // If this is an upsert, you'll need the create permission
    // TODO add some tests for the upset case
    if (
      query.options
      && query.options.upsert
      && !hasPermission(schema, authLevels, 'create')
    ) {
      throw new PermissionDeniedError('create');
    }

    const authorizedFields = getAuthorizedFields(schema, authLevels, 'write');

    // check to see if the group is trying to update a field it does not have permission to
    const modifiedPaths = getUpdatePaths(query._update);
    const discrepancies = _.difference(modifiedPaths, authorizedFields);
    if (discrepancies.length > 0) {
      throw new PermissionDeniedError('write', discrepancies);
    }

    // TODO handle the overwrite option
    // TODO handle Model.updateMany

    // Detect which fields can be returned if 'new: true' is set
    const authorizedReturnFields = getAuthorizedFields(schema, authLevels, 'read');

    // create a sanitizedReturnFields object that will be used to return only the fields that a
    // group has access to read
    const sanitizedReturnFields = {};
    authorizedReturnFields.forEach((field) => {
      if (!query._fields || query._fields[field]) {
        sanitizedReturnFields[field] = 1;
      }
    });
    query._fields = sanitizedReturnFields;
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

  // PRE- DOCUMENT hooks
  // We do a bit of manual promise handling for these two (pre-save and pre-remove)
  // because the only way to get mongoose to pass in an options dict on document middleware
  // is to have arguments to the middleware function. If we have arguments, mongoose
  // assume we want to use a `next()` function. FML
  schema.pre('save', function preSave(next, options) {
    if (authIsDisabled(options)) { return next(); }
    return save(this, options)
      .then(() => next())
      .catch(next);
  });
  // TODO, WTF, how to prevent someone from Model.find().remove().exec(); That doesn't
  // fire any remove hooks. Does it fire a find hook?
  schema.pre('remove', function preRemove(next, options) {
    if (authIsDisabled(options)) { return next(); }
    return removeDoc(this, options)
      .then(() => next())
      .catch(next);
  });
  schema.pre('findOneAndRemove', async function preFindOneAndRemove() {
    if (authIsDisabled(this.options)) { return; }
    await removeQuery(this);
  });
  schema.post('find', async function postFind(docs) {
    if (authIsDisabled(this.options)) { return; }
    await find(this, docs);
  });
  schema.post('findOne', async function postFindOne(doc) {
    if (authIsDisabled(this.options)) { return; }
    await find(this, doc);
  });
  schema.pre('update', async function preUpdate() {
    if (authIsDisabled(this.options)) { return; }
    await update(this);
  });
  schema.pre('findOneAndUpdate', async function preFindOneAndUpdate() {
    if (authIsDisabled(this.options)) { return; }
    await update(this);
  });

  schema.query.setAuthLevel = function setAuthLevel(authLevel) {
    this.options.authLevel = authLevel;
    return this;
  };

  // TODO add tests for this function
  schema.statics.canCreate = async function canCreate(options) {
    // Check just the blank document since nothing exists yet
    const authLevels = await resolveAuthLevel(schema, options, {});
    return hasPermission(this.schema, authLevels, 'create');
  };
};
