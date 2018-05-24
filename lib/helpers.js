const _ = require('lodash');

async function resolveAuthLevel(schema, options, doc) {
  // Look into options the options and try to find authLevels. Always prefer to take
  // authLevels from the direct authLevel option as opposed to the computed
  // ones from getAuthLevel in the schema object.
  let authLevels = [];
  if (options) {
    if (options.authLevel) {
      authLevels = _.castArray(options.authLevel);
    } else if (typeof schema.getAuthLevel === 'function') {
      if (!options.authPayload) {
        throw new Error('An `authPayload` must exist with a `getAuthLevel` method.');
      }
      if (!doc) {
        throw new Error('This type of query is not compatible with using a getAuthLevel method.');
      }
      authLevels = _.castArray(await schema.getAuthLevel(options.authPayload, doc));
    }
  }

  // Add `defaults` to the list of levels since you should always be able to do what's specified
  // in defaults.
  authLevels.push('defaults');

  return cleanAuthLevels(schema, authLevels);
}

// TODO add tests
function cleanAuthLevels(schema, authLevels) {
  const perms = schema.permissions || {};

  return _.chain(authLevels)
    .castArray()
    .filter(level => !!perms[level]) // make sure the level in the permissions dict
    .uniq() // get rid of fields mentioned in multiple levels
    .value();
}

function getAuthorizedFields(schema, authLevels, action) {
  const cleanedLevels = cleanAuthLevels(schema, authLevels);

  return _.chain(cleanedLevels)
    .flatMap(level => schema.permissions[level][action])
    .filter(path => schema.pathType(path) !== 'adhocOrUndefined') // ensure fields are in schema
    .uniq() // dropping duplicates
    .value();
}

function hasPermission(schema, authLevels, action) {
  const perms = schema.permissions || {};

  // look for any permissions setting for this action that is set to true (for these authLevels)
  const cleanedLevels = cleanAuthLevels(schema, authLevels);
  return _.some(cleanedLevels, level => perms[level][action])
}

function authIsDisabled(options) {
  return options && options.authLevel === false;
}

function embedPermissions(schema, options, authLevels, doc) {
  if (!options || !options.permissions) { return; }

  const permsKey = options.permissions === true ? 'permissions' : options.permissions;
  doc[permsKey] = {
    read: getAuthorizedFields(schema, authLevels, 'read'),
    write: getAuthorizedFields(schema, authLevels, 'write'),
    remove: hasPermission(schema, authLevels, 'remove'),
  };
}

async function sanitizeDocument(schema, options, doc) {
  if (!doc) { return; }

  // If there are subschemas that need to be authorized, store a reference to the top
  // level doc so they have context when doing their authorization checks
  const optionAddition = {};
  if (!options.originalDoc && !_.isEmpty(schema.pathsWithPermissionedSchemas)) {
    optionAddition.authPayload = { originalDoc: doc };
  }
  const docOptions = _.merge({}, options, optionAddition);


  const authLevels = await resolveAuthLevel(schema, docOptions, doc);
  const authorizedFields = getAuthorizedFields(schema, authLevels, 'read');

  // Check to see if group has the permission to see the fields that came back.
  // We must edit the document in place to maintain the right reference
  // Also, we use `_.pick` to make sure that we can handle paths that are deep
  // reference to nested objects, like `nested.subpath`.

  // `doc._doc` contains the plain JS object with all the data we care about if `doc` is a
  // Mongoose Document.
  const innerDoc = doc._doc || doc;
  const newDoc = _.pick(innerDoc, authorizedFields);

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
  embedPermissions(schema, docOptions, authLevels, doc);

  // Apply the rules down one level if there are any path specific permissions
  const subDocSanitationPromises = _.map(
    schema.pathsWithPermissionedSchemas,
    async (path, subSchema) => {
      if (innerDoc[path]) {
        // eslint-disable-next-line no-use-before-define
        innerDoc[path] = await sanitizeDocumentList(subSchema, docOptions, innerDoc[path]);
      }
    },
  );

  await Promise.all(subDocSanitationPromises);
}

async function sanitizeDocumentList(schema, options, docs) {
  const multi = _.isArrayLike(docs);

  if (!multi) {
    sanitizeDocument(schema, options, docs);
    return;
  }

  const sanitizationPromises = docs.map(
    doc => sanitizeDocument(schema, options, doc),
  );
  await Promise.all(sanitizationPromises);

  _.remove(docs, doc => _.isEmpty(doc._doc || doc));
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
