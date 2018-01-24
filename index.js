'use strict';

var _ = require('lodash');

module.exports = function (schema) {
    schema.pre('save', function (next) {
        save(this, next);
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

    function hasPermission(vm, action) {
        var authLevel = vm.options.authLevel;

        if (Array.isArray(authLevel)) {
            return authLevel.filter(function (level) {
                return vm.schema.permissions[level] && !!vm.schema.permissions[level][action];
            }).length > 0;
        } else {
            return vm.schema.permissions[authLevel] && vm.schema.permissions[authLevel][action];
        }
    }

    function authOptionPresent(vm) {
        return vm.options && vm.options.authLevel;
    }

    function getAuthorizedFields(vm, action) {
        var authLevel = vm.options.authLevel;

        if (Array.isArray(authLevel)) {
            return authLevel.reduce(function (acc, level) {
                if(vm.schema.permissions[level] && vm.schema.permissions[level][action]) {
                    return acc.concat(vm.schema.permissions[level][action])
                }
                return acc.concat([])
            }, []);
        } else {
            return vm.schema.permissions[authLevel][action] || [];
        }
    }

    function save(schema, next) {
        var vm = schema;
        if (authOptionPresent(vm)) {
            if (hasPermission(vm, 'save')) {
                //check to see if the group has permission to save a new document
                return next();
            } else {
                return next({
                    message: 'permission denied',
                    reason: 'you do not have access to the following permissions: [save]'
                });
            }
        } else {
            return next();
        }
    }

    function remove(schema, next) {
        var vm = schema;
        if (authOptionPresent(vm)) {
            if (hasPermission(vm, 'remove')) {
                //check to see if the group has permission to remove a document
                return next();
            } else {
                return next({
                    message: 'permission denied',
                    reason: 'you do not have access to the following permissions: [remove]'
                });
            }
        } else {
            return next();
        }
    }

    function find(schema, next) {
        var vm = schema;
        var authorizedFields = [];
        if (authOptionPresent(vm)) {
            if (hasPermission(vm, 'read')) {
                //check to see if the group has any read permissions and add to the authorizedFields array
                authorizedFields = authorizedFields.concat(getAuthorizedFields(vm, 'read'));
            }
            if (vm.schema.permissions.defaults && vm.schema.permissions.defaults.read) {
                //check to see if there are any default read permissions and add to the authorizedFields array
                authorizedFields = authorizedFields.concat(vm.schema.permissions.defaults.read);
            }

            //create a projection object for mongoose based on the authorizedFields array
            var sanitizedFind = {};
            authorizedFields.forEach(function (field) {
                sanitizedFind[field] = 1;
            });

            //Check to see if group has the permission to perform a find using the specified fields
            var discrepancies = _.difference(Object.keys(vm._conditions), Object.keys(sanitizedFind));
            if (discrepancies[0]) {
                //if a group is searching by a field they do not have access to, return an error
                return next({
                    message: 'permission denied',
                    reason: 'you do not have access to the following fields: [' + discrepancies.toString() + ']'
                });
            } else {
                vm._fields = sanitizedFind;
                return next();
            }
        } else {
            return next();
        }
    }

    function update(schema, next) {
        var vm = schema;
        var authorizedFields = [];
        var authorizedReturnFields = [];
        if (authOptionPresent(vm)) {
            if (vm.options.upsert && !hasPermission(vm, 'save')) {
                //check to see if 'upsert: true' option is set, then verify if group has save permission
                return next({
                    message: 'permission denied',
                    reason: 'you do not have access to the following permissions: [save]'
                });
            }
            if (hasPermission(vm, 'write')) {
                //check to see if group has any write permissions and add to the authorizedFields array
                authorizedFields = authorizedFields.concat(getAuthorizedFields(vm, 'write'));
            }
            if (vm.schema.permissions.defaults && vm.schema.permissions.defaults.write) {
                //check to see if there are any default write permissions and add to the authorizedFields array
                authorizedFields = authorizedFields.concat(vm.schema.permissions.defaults.write);
            }

            //create an update object that has been sanitized based on permissions
            var sanitizedUpdate = {};
            authorizedFields.forEach(function (field) {
                sanitizedUpdate[field] = vm._update[field];
            });

            //check to see if the group is trying to update a field it does not have permission to
            var discrepancies = _.difference(Object.keys(vm._update), Object.keys(sanitizedUpdate));
            if (discrepancies[0]) {
                //if a group is searching by a field they do not have access to, return an error
                return next({
                    message: 'permission denied',
                    reason: 'you do not have access to the following fields: [' + discrepancies.toString() + ']'
                });
            } else {

                //Detect which fields can be returned if 'new: true' is set
                if (hasPermission(vm, 'read')) {

                    //check to see if the group has any read permissions and add to the authorizedFields array
                    authorizedReturnFields = authorizedReturnFields.concat(getAuthorizedFields(vm, 'read'));
                }
                if (vm.schema.permissions.defaults && vm.schema.permissions.defaults.read) {

                    //check to see if there are any default read permissions and add to the authorizedFields array
                    authorizedReturnFields = authorizedReturnFields.concat(vm.schema.permissions.defaults.read);
                }

                //create a sanitizedReturnFields object that will be used to return only the fields that a group has access to read
                var sanitizedReturnFields = {};
                authorizedReturnFields.forEach(function (field) {
                    sanitizedReturnFields[field] = 1;
                });
                vm._fields = sanitizedReturnFields;
                return next();
            }
        } else {
            return next();
        }
    }
};
