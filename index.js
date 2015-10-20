'use strict';

var _ = require('lodash');

module.exports = function(schema) {
  schema.pre('save', function(next) {
    save(this, next);
  });
  schema.pre('findOneAndRemove', function(next) {
    remove(this, next);
  });
  schema.pre('find', function(next) {
    find(this, next);
  });
  schema.pre('findOne', function(next) {
    find(this, next);
  });
  schema.pre('update', function(next) {
    update(this, next);
  });
  schema.pre('findOneAndUpdate', function(next) {
    update(this, next);
  });

  function save(schema, next) {
    var vm = schema;
    if (vm.options && vm.options.authLevel) {
      if (vm.schema.permissions[vm.options.authLevel] && vm.schema.permissions[vm.options.authLevel].save) {
        //check to see if the group has permission to save a new document
        return next();
      } else {
        return next(new Error({message: 'permission denied', reason: 'you do not have access to the following permissions: [save]'}));
      }
    } else {
      return next();
    }
  }

  function remove(schema, next) {
    var vm = schema;
    if (vm.options && vm.options.authLevel) {
      if (vm.schema.permissions[vm.options.authLevel] && vm.schema.permissions[vm.options.authLevel].remove) {
        //check to see if the group has permission to remove a document
        return next();
      } else {
        return next(new Error({message: 'permission denied', reason: 'you do not have access to the following permissions: [remove]'}));
      }
    } else {
      return next();
    }
  }

  function find(schema, next) {
    var vm = schema;
    var authorizedFields = [];
    if (vm.options && vm.options.authLevel) {
      if (vm.schema.permissions[vm.options.authLevel] && vm.schema.permissions[vm.options.authLevel].read) {
        //check to see if the group has any read permissions and add to the authorizedFields array
        authorizedFields = authorizedFields.concat(vm.schema.permissions[vm.options.authLevel].read);
      }
      if (vm.schema.permissions.defaults && vm.schema.permissions.defaults.read) {
        //check to see if there are any default read permissions and add to the authorizedFields array
        authorizedFields = authorizedFields.concat(vm.schema.permissions.defaults.read);
      }

      //create a projection object for mongoose based on the authorizedFields array
      var sanitizedFind = {};
      authorizedFields.forEach(function(field) {
        sanitizedFind[field] = 1;
      });

      //Check to see if group has the permission to permorm a find using the specified fields
      var discrepancies = _.difference(Object.keys(vm._conditions), Object.keys(sanitizedFind));
      if (discrepancies[0]) {
        //if a group is searching by a field they do not have access to, return an error
        return next(new Error({message: 'permission denied', reason: 'you do not have access to the following fields: [' + discrepancies.toString() + ']'}));
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
    if (vm.options && vm.options.authLevel) {
      if (vm.options.upsert && !vm.schema.permissions[vm.options.authLevel].save) {
        return next(new Error({message: 'permission denied', reason: 'you do not have access to the following permissions: [save]'}));
      }
      if (vm.schema.permissions[vm.options.authLevel] && vm.schema.permissions[vm.options.authLevel].write) {
        authorizedFields = authorizedFields.concat(vm.schema.permissions[vm.options.authLevel].write);
      }
      if (vm.schema.permissions.defaults && vm.schema.permissions.defaults.write) {
        authorizedFields = authorizedFields.concat(vm.schema.permissions.defaults.write);
      }
      var sanitizedUpdate = {};
      authorizedFields.forEach(function(field) {
        sanitizedUpdate[field] = vm._update[field];
      });

      //check to see if the group is trying to update a field it does not have permission to
      var discrepancies = _.difference(Object.keys(vm._update), Object.keys(sanitizedUpdate));
      if (discrepancies[0]) {
        //if a group is searching by a field they do not have access to, return an error
        return next(new Error({message: 'permission denied', reason: 'you do not have access to the following fields: [' + discrepancies.toString() + ']'}));
      } else {

        //Detect which fields can be returned if 'new: true' is set
        if (vm.schema.permissions[vm.options.authLevel] && vm.schema.permissions[vm.options.authLevel].read) {
          authorizedReturnFields = authorizedReturnFields.concat(vm.schema.permissions[vm.options.authLevel].read);
        }
        if (vm.schema.permissions.defaults && vm.schema.permissions.defaults.read) {
          authorizedReturnFields = authorizedReturnFields.concat(vm.schema.permissions.defaults.read);
        }
        var sanitizedReturnFields = {};
        authorizedReturnFields.forEach(function(field) {
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
