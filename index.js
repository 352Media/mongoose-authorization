'use strict';

var _ = require('lodash');

module.exports = function (schema, pluginOptions) {
    schema.pre('save', function (options, next) {
        save(this, options, next);
    });
    schema.pre('findOneAndRemove', function (next) {
        remove(this, next);
    });
    schema.pre('find', function (next) {
        find(this, next);
    });
    schema.pre('findOne', function (next) {
        find(this, next);
    });
    schema.post('find', function (doc, next) {
        findPost(this, doc, next);
    });
    schema.post('findOne', function (doc, next) {
        findPost(this, doc, next);
    });
    schema.pre('update', function (next) {
        update(this, next);
    });
    schema.pre('findOneAndUpdate', function (next) {
        update(this, next);
    });

    schema.query.setAuthLevel = function(authLevel) {
        this.options.authLevel = authLevel;
        return this;
    };

    function hasPermission(authLevels, action) {
        return !_.isEmpty(getAuthorizedFields(authLevels, action));
    }

    function resolveQueryAuthLevel(options, doc) {
        return options && options.authLevel;
    }

    function resolveDocAuthLevel(options, doc) {
        if (options && doc && typeof schema.getAuthLevel === 'function') {
            return schema.getAuthLevel(options.authPayload, doc);
        }
    }

    function getAuthorizedFields(authLevels, action) {
        var authLevels = _.castArray(authLevels);
        authLevels.push('defaults');

        return _.chain(authLevels)
            .map(function(level) {
                return schema.permissions[level] && schema.permissions[level][action];
            })
            .faltten()
            .filter()  //some values might be falsey if the given authLevel didn't exist
            .uniq()    //dropping duplicates
            .value();
    }

    function authIsRequired(action) {
        if (pluginOptions) {
            if (_.isArray(pluginOptions.required)) {
                return _.includes(pluginOptions.required, action);
            }

            return !!pluginOptions.required;
        }

        return false;
    }

    function save(doc, options, next) {
        var authLevel = resolveQueryAuthLevel(options) || resolveDocAuthLevel(options, doc);
        if (authLevel) {
            if (hasPermission(authLevel, 'save')) {
                //check to see if the group has permission to save changes or create a new document
                return next();
            } else {
                return next({
                    message: 'permission denied',
                    reason: 'you do not have access to the following permissions: [save]'
                });
            }
        } else if (authIsRequired('save')) {
            return next({
                message: 'permission denied',
                reason: 'you must specify an authLevel in order to [save]'
            });
        } else {
            return next();
        }
    }

    function remove(query, next) {
        var authLevel = resolveQueryAuthLevel(query.options);
        if (authLevel) {
            if (hasPermission(authLevel, 'remove')) {
                //check to see if the group has permission to remove a document
                return next();
            } else {
                return next({
                    message: 'permission denied',
                    reason: 'you do not have access to the following permissions: [remove]'
                });
            }
        } else if (authIsRequired('remove')) {
            return next({
                message: 'permission denied',
                reason: 'you must specify an authLevel in order to [remove]'
            });
        } else {
            return next();
        }
    }

    function find(query, next) {
        var authLevel = resolveQueryAuthLevel(query.options);
        if (authLevel) {
            var authorizedFields = getAuthorizedFields(authLevel, 'read');

            //create a projection object for mongoose based on the authorizedFields array
            var sanitizedFind = {};
            authorizedFields.forEach(function (field) {
                sanitizedFind[field] = 1;
            });

            //Check to see if group has the permission to perform a find using the specified fields
            var discrepancies = _.difference(Object.keys(query._conditions), Object.keys(sanitizedFind));
            if (discrepancies[0]) {
                //if a group is searching by a field they do not have access to, return an error
                return next({
                    message: 'permission denied',
                    reason: 'you do not have access to the following fields: [' + discrepancies.toString() + ']'
                });
            } else {
                query._fields = sanitizedFind;
                return next();
            }
        } else {
            return next();
        }
    }

    function findPost(query, doc, next) {
        var authLevel = resolveDocAuthLevel(query.options, doc);
        var authLevelFromAnywhere = authLevel || resolveQueryAuthLevel(query.options);

        if (authLevel) {
            var authorizedFields = getAuthorizedFields(authLevel, 'read');

            //Check to see if group has the permission to see the fields that came back
            var discrepancies = _.difference(Object.keys(doc), authorizedFields);
            if (!_.isEmpty(discrepancies)) {
                //if a group is searching by a field they do not have access to, return an error
                return next({
                    message: 'permission denied',
                    reason: 'you do not have access to the following fields: [' + discrepancies.toString() + ']'
                });
            }

            return next();
        } else if (authIsRequired('find') && !authLevelFromAnywhere) {
            //Auth level for actions (or just find), there's no Query authLevel or Document auth Level
            return next({
                message: 'permission denied',
                reason: 'you must specify an authLevel in order to [find]'
            });
        } else {
            return next();
        }
    }

    function update(query, next) {
        var authLevel = resolveQueryAuthLevel(query.options);
        var authorizedReturnFields = [];
        if (authLevel) {
            if (query.options.upsert && !hasPermission(authLevel, 'save')) {
                //check to see if 'upsert: true' option is set, then verify if group has save permission
                return next({
                    message: 'permission denied',
                    reason: 'you do not have access to the following permissions: [save]'
                });
            }

            var authorizedFields = getAuthorizedFields(authLevel, 'write');

            //create an update object that has been sanitized based on permissions
            var sanitizedUpdate = {};
            authorizedFields.forEach(function (field) {
                sanitizedUpdate[field] = query._update[field];
            });

            //check to see if the group is trying to update a field it does not have permission to
            var discrepancies = _.difference(Object.keys(query._update), Object.keys(sanitizedUpdate));
            if (discrepancies[0]) {
                //if a group is searching by a field they do not have access to, return an error
                return next({
                    message: 'permission denied',
                    reason: 'you do not have access to the following fields: [' + discrepancies.toString() + ']'
                });
            }

            //Detect which fields can be returned if 'new: true' is set
            var authorizedReturnFields = getAuthorizedFields(authLevel, 'read');

            //create a sanitizedReturnFields object that will be used to return only the fields that a group has access to read
            var sanitizedReturnFields = {};
            authorizedReturnFields.forEach(function (field) {
                sanitizedReturnFields[field] = 1;
            });
            query._fields = sanitizedReturnFields;
            return next();
        } else if (authIsRequired('update')) {
            return next({
                message: 'permission denied',
                reason: 'you must specify an authLevel in order to [update]'
            });
        } else {
            return next();
        }
    }
};
