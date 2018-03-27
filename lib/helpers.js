const _ = require('lodash');

function resolveAuthLevel(schema, options, doc) {
  // Look into options the options and try to find authLevels. Always prefer to take
  // authLevels from the direct authLevel option as opposed to the computed
  // ones from getAuthLevel in the schema object.
  let authLevels = [];
  if (options) {
    if (options.authLevel) {
      authLevels = _.castArray(options.authLevel);
    } else if (typeof schema.getAuthLevel === 'function') {
      authLevels = _.castArray(schema.getAuthLevel(options.authPayload, doc));
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

function getAuthorizedFields(schema, options, action, doc) {
  const authLevels = resolveAuthLevel(schema, options, doc);

  return _.chain(authLevels)
    .map(level => schema.permissions[level][action])
    .flatten()
    .filter(path => schema.path(path) || schema.virtualpath(path)) // make sure the fields are in the schema
    .uniq() // dropping duplicates
    .value();
}

function hasPermission(schema, options, action, doc) {
  const authLevels = resolveAuthLevel(schema, options, doc);
  const perms = schema.permissions || {};

  // look for any permissions setting for this action that is set to true (for these authLevels)
  return _.some(authLevels, level => perms[level][action]);
}

module.exports = {
  resolveAuthLevel,
  getAuthorizedFields,
  hasPermission,
};
