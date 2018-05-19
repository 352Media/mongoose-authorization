"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
function resolveAuthLevel(schema, options, doc) {
    // Look into options the options and try to find authLevels. Always prefer to take
    // authLevels from the direct authLevel option as opposed to the computed
    // ones from getAuthLevel in the schema object.
    var authLevels = [];
    if (options) {
        if (options.authLevel) {
            authLevels = _.castArray(options.authLevel);
        }
        else if (typeof schema.getAuthLevel === 'function') {
            authLevels = _.castArray(schema.getAuthLevel(options.authPayload, doc));
        }
    }
    // Add `defaults` to the list of levels since you should always be able to do what's specified
    // in defaults.
    authLevels.push('defaults');
    var perms = schema.permissions || {};
    return _.chain(authLevels)
        .filter(function (level) { return !!perms[level]; }) // make sure the level in the permissions dict
        .uniq() // get rid of fields mentioned in multiple levels
        .value();
}
exports.resolveAuthLevel = resolveAuthLevel;
function getAuthorizedFields(schema, options, action, doc) {
    var authLevels = resolveAuthLevel(schema, options, doc);
    return _.chain(authLevels)
        .flatMap(function (level) { return schema.permissions[level][action]; })
        .filter(function (path) { return schema.pathType(path) !== 'adhocOrUndefined'; }) // ensure fields are in schema
        .uniq() // dropping duplicates
        .value();
}
exports.getAuthorizedFields = getAuthorizedFields;
function hasPermission(schema, options, action, doc) {
    var authLevels = resolveAuthLevel(schema, options, doc);
    var perms = schema.permissions || {};
    // look for any permissions setting for this action that is set to true (for these authLevels)
    return _.some(authLevels, function (level) { return perms[level][action]; });
}
exports.hasPermission = hasPermission;
function authIsDisabled(options) {
    return options && options.authLevel === false;
}
exports.authIsDisabled = authIsDisabled;
function embedPermissions(schema, options, doc) {
    if (!options || !options.permissions) {
        return;
    }
    var permsKey = options.permissions === true ? 'permissions' : options.permissions;
    doc[permsKey] = {
        read: getAuthorizedFields(schema, options, 'read', doc),
        write: getAuthorizedFields(schema, options, 'write', doc),
        remove: hasPermission(schema, options, 'remove', doc),
    };
}
exports.embedPermissions = embedPermissions;
function sanitizeDocument(schema, options, doc) {
    var authorizedFields = getAuthorizedFields(schema, options, 'read', doc);
    if (!doc || getAuthorizedFields.length === 0) {
        return false;
    }
    // Check to see if group has the permission to see the fields that came back.
    // We must edit the document in place to maintain the right reference
    // Also, we use `_.pick` to make sure that we can handle paths that are deep
    // reference to nested objects, like `nested.subpath`.
    // `doc._doc` contains the plain JS object with all the data we care about if `doc` is a
    // Mongoose Document.
    var innerDoc = doc._doc || doc;
    var newDoc = _.pick(innerDoc, authorizedFields);
    if (_.isEmpty(newDoc)) {
        // There are no fields that can be seen, just return now
        return false;
    }
    // Empty out the object so we can put in other the paths that were `_.pick`ed
    // Then copy back only the info the user is allowed to see
    Object.keys(innerDoc).forEach(function (pathName) {
        delete innerDoc[pathName];
    });
    Object.assign(innerDoc, newDoc);
    // Special work. Wipe out the getter for the virtuals that have been set on the
    // schema that are not authorized to come back
    Object.keys(schema.virtuals).forEach(function (pathName) {
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
        embedPermissions(schema, options, doc);
    }
    // Apply the rules down one level if there are any path specific permissions
    _.each(schema.pathsWithPermissionedSchemas, function (path, subSchema) {
        if (innerDoc[path]) {
            // eslint-disable-next-line no-use-before-define
            innerDoc[path] = sanitizeDocumentList(subSchema, options, innerDoc[path]);
        }
    });
    return doc;
}
exports.sanitizeDocument = sanitizeDocument;
function sanitizeDocumentList(schema, options, docs) {
    var multi = _.isArrayLike(docs);
    var docList = _.castArray(docs);
    var filteredResult = _.chain(docList)
        .map(function (doc) {
        var upgradedOptions = _.isEmpty(schema.pathsWithPermissionedSchemas)
            ? options
            : _.merge({}, options, { authPayload: { originalDoc: doc } });
        return sanitizeDocument(schema, upgradedOptions, doc);
    })
        .filter(docList)
        .value();
    return multi ? filteredResult : filteredResult[0];
}
exports.sanitizeDocumentList = sanitizeDocumentList;
function getUpdatePaths(updates) {
    // query._update is sometimes in the form of `{ $set: { foo: 1 } }`, where the top level
    // is atomic operations. See: http://mongoosejs.com/docs/api.html#query_Query-update
    // For findOneAndUpdate, the top level may be the fields that we want to examine.
    return _.flatMap(updates, function (val, key) {
        if (_.startsWith(key, '$')) {
            return Object.keys(val);
        }
        return key;
    });
}
exports.getUpdatePaths = getUpdatePaths;
//# sourceMappingURL=helpers.js.map