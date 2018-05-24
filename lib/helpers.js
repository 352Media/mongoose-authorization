const _ = require('lodash');

const authLevelCache = new WeakMap();
async function resolveAuthLevel(schema, options, doc) {
  // Look into options the options and try to find authLevels. Always prefer to take
  // authLevels from the direct authLevel option as opposed to the computed
  // ones from getAuthLevel in the schema object.
  let authLevels = [];
  if (options) {
    if (options.authLevel) {
      authLevels = _.castArray(options.authLevel);
    } else if (typeof schema.getAuthLevel === 'function') {
      let arg2Map = authLevelCache.get(options)
      if (!arg2Map) {
        arg2Map = new WeakMap();
        authLevelCache.set(options, arg2Map);
      }
      const cachedValue = arg2Map.get(doc);
      if (cachedValue) {
        authLevels = cachedValue;
      } else {
        if (!doc) throw new Error("getAuthLevel only supports methods with model data available");
        authLevels = _.castArray(await schema.getAuthLevel(options.authPayload, doc));
        arg2Map.set(doc, authLevels);
      }
    }
  }

  // Add `defaults` to the list of levels since you should always be able to do what's specified
  // in defaults.
  authLevels.push('defaults');

  const perms = schema.permissions || {};
  return _.chain(authLevels)
    .filter(level => !!perms[level]) // make sure the level in the permissions dict
    .uniq() // get rid of fields mentioned in multiple levels
    .value();
}

async function getAuthorizedFields(schema, options, action, doc) {
  const authLevels = await resolveAuthLevel(schema, options, doc);

  return _.chain(authLevels)
    .flatMap(level => schema.permissions[level][action])
    .filter(path => schema.pathType(path) !== 'adhocOrUndefined') // ensure fields are in schema
    .uniq() // dropping duplicates
    .value();
}

async function hasPermission(schema, options, action, doc) {
  let authLevels
  try {
    authLevels = await resolveAuthLevel(schema, options, doc);
  } catch (e) {
    authLevels = [];
  }
  const perms = schema.permissions || {};

  // look for any permissions setting for this action that is set to true (for these authLevels)
  return _.some(authLevels, level => perms[level][action]);
}

function authIsDisabled(options) {
  return options && options.authLevel === false;
}

async function embedPermissions(schema, options, doc) {
  if (!options || !options.permissions) { return; }

  const permsKey = options.permissions === true ? 'permissions' : options.permissions;
  doc[permsKey] = {
    read: await getAuthorizedFields(schema, options, 'read', doc),
    write: await getAuthorizedFields(schema, options, 'write', doc),
    remove: await hasPermission(schema, options, 'remove', doc),
  };
}

async function sanitizeDocument(schema, options, doc) {
  const authorizedFields = await getAuthorizedFields(schema, options, 'read', doc);

  if (!doc || authorizedFields.length === 0) { return false; }

  // Check to see if group has the permission to see the fields that came back.
  // We must edit the document in place to maintain the right reference
  // Also, we use `_.pick` to make sure that we can handle paths that are deep
  // reference to nested objects, like `nested.subpath`.

  // `doc._doc` contains the plain JS object with all the data we care about if `doc` is a
  // Mongoose Document.
  const innerDoc = doc._doc || doc;
  const newDoc = _.pick(innerDoc, authorizedFields);
  if (_.isEmpty(newDoc)) {
    // There are no fields that can be seen, just return now
    return false;
  }

  // Empty out the object so we can put in other the paths that were `_.pick`ed
  // Then copy back only the info the user is allowed to see
  Object.keys(innerDoc).forEach((pathName) => {
    delete innerDoc[pathName];
  });
  Object.assign(innerDoc, newDoc);

  // Special work. Wipe out the getter for the virtuals that have been set on the
  // schema that are not authorized to come back
  Object.keys(schema.virtuals).forEach((pathName) => {
    if (!_.includes(authorizedFields, pathName)) {
      // These virtuals are set with `Object.defineProperty`. You cannot overwrite them
      // by directly setting the value to undefined, or by deleting the key in the
      // document. This is potentially slow with lots of virtuals
      Object.defineProperty(doc, pathName, {
        value: undefined,
      });
    }
  });

  // Check to see if we're going to be inserting the permissions info
  if (options.permissions) {
    await embedPermissions(schema, options, doc);
  }

  // Apply the rules down one level if there are any path specific permissions
  await Promise.all(_.map(schema.pathsWithPermissionedSchemas, async (path, subSchema) => {
    if (innerDoc[path]) {
      // eslint-disable-next-line no-use-before-define
      innerDoc[path] = await sanitizeDocumentList(subSchema, options, innerDoc[path]);
    }
  }));

  return doc;
}

async function sanitizeDocumentList(schema, options, docs) {
  const multi = _.isArrayLike(docs);
  const docList = _.castArray(docs);
  const sanitizeAndAddOptions = (doc) => {
    const upgradedOptions = _.isEmpty(schema.pathsWithPermissionedSchemas)
      ? options
      : _.merge({}, options, { authPayload: { originalDoc: doc } });
    return sanitizeDocument(schema, upgradedOptions, doc);
  };

  const filteredResult = (
    await Promise.all(docList.map(sanitizeAndAddOptions))
  ).filter(doc => !doc);

  return multi ? (filteredResult) : filteredResult[0];
}

function getUpdatePaths(updates) {
  // query._update is sometimes in the form of `{ $set: { foo: 1 } }`, where the top level
  // is atomic operations. See: http://mongoosejs.com/docs/api.html#query_Query-update
  // For findOneAndUpdate, the top level may be the fields that we want to examine.
  return _.flatMap(updates, (val, key) => {
    if (_.startsWith(key, '$')) {
      return Object.keys(val);
    }

    return key;
  });
}

module.exports = {
  resolveAuthLevel,
  getAuthorizedFields,
  hasPermission,
  authIsDisabled,
  embedPermissions,
  sanitizeDocumentList,
  getUpdatePaths,
};
