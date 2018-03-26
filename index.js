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

  function saveDoc(doc, options, next) {
    if (doc.isNew && !hasPermission(schema, options, 'create', doc)) {
      return next(new PermissionDeniedError('create'));
    }

    // TODO make sure you can't update fields that are outside of your permissions
    // probably need to check the isModified stuff
    if (!hasPermission(schema, options, 'write')) {
      return next(new PermissionDeniedError('write'));
    }

    return next();
  }

  function removeQuery(query, next) {
    // TODO see if there's an option for returning the object and filter what goes back
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

  // Make sure you are can only query on the fields you can see.
  //
  // Note: We don't mess with the selected fields at all here. Since you can specify fields
  // exclusively, and mongoose could be set to return all the garbage that might be in the DB,
  // we need to wait until the post hook (where we actually have the doc) so we can see what's
  // actually in there and then filter.
  function find(query, next) {
    const authorizedFields = getAuthorizedFields(schema, query.options, 'read');

    // If there are no authorized fields, there are two possibilities. (A) The provided authLevel
    // can't see this table at all, or (B) the authLevel determination will happen in
    // `Schema.getAuthLevel` once we have a document. Since we can't tell the difference, just
    // let the query through for now and then know that it'll be cleaned up in the post hook.
    if (getAuthorizedFields.length === 0) {
      return next();
    }
    // TODO, should this whole function also run in the post hook? see above comment

    // create a projection object for mongoose based on the authorizedFields array
    const sanitizedFind = {};
    authorizedFields.forEach((field) => {
      sanitizedFind[field] = 1;
    });

    // Check to see if group has the permission to perform a find using the specified fields
    // TODO, what if there are no conditions, but you have no authorized fields?
    const discrepancies = _.difference(
      Object.keys(query._conditions),
      authorizedFields,
    );
    if (discrepancies.length > 0) {
      // if a group is searching by a field they do not have access to, return an error
      return next(new PermissionDeniedError('read', discrepancies));
    }

    return next();
  }

  function findPost(query, docs, next) {
    const docList = _.castArray(docs);
    const multi = docList.length;

    const processedResult = _.map(docList, (doc) => {
      const authorizedFields = getAuthorizedFields(schema, query.options, 'read', doc);

      if (getAuthorizedFields.length === 0) {
        return;
      }

      // Check to see if group has the permission to see the fields that came back. Fields
      // that don't will be removed.
      // TODO, figure out how to handle lean and hydrated documents
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

  // TODO maybe replace this with a hook on find that checks to see if the query involves removing
  // stuff
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
    return saveDoc(this, options, next);
  });
  schema.pre('find', function preFind(next) {
    if (!authorizationEnabled) { return next(); }
    return find(this, next);
  });
  schema.pre('findOne', function preFindOne(next) {
    if (!authorizationEnabled) { return next(); }
    return find(this, next);
  });
  schema.post('find', function postFind(doc, next) {
    if (!authorizationEnabled) { return next(); }
    return findPost(this, doc, next);
  });
  schema.post('findOne', function postFindOne(doc, next) {
    if (!authorizationEnabled) { return next(); }
    return findPost(this, doc, next);
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
