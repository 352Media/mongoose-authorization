'use strict';
module.exports = function(schema) {
  schema.pre('save', function(next) {
    save(this, next);
  });
  schema.pre('remove', function(next) {
    //TODO: add ability to handle remove
    next();
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
        return next();
      } else {
        return next(new Error('permission denied'));
      }
    } else {
      return next();
    }
  }

  function remove(schema, next) {
    var vm = schema;
    if (vm.options && vm.options.authLevel) {
      if (vm.schema.permissions[vm.options.authLevel] && vm.schema.permissions[vm.options.authLevel].remove) {
        return next();
      } else {
        return next(new Error('permission denied'));
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
        authorizedFields = authorizedFields.concat(vm.schema.permissions[vm.options.authLevel].read);
      }
      if (vm.schema.permissions.defaults && vm.schema.permissions.defaults.read) {
        authorizedFields = authorizedFields.concat(vm.schema.permissions.defaults.read);
      }
      var sanitizedFind = {};
      authorizedFields.forEach(function(field) {
        sanitizedFind[field] = 1;
      });
      vm._fields = sanitizedFind;
      return next();
    } else {
      return next();
    }
  }

  function update(schema, next) {
    var vm = schema;
    var authorizedFields = [];
    if (vm.options && vm.options.authLevel) {
      if (vm.options.upsert && !vm.schema.permissions[vm.options.authLevel].save) {
        return next(new Error('permission denied'));
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
      vm._update = sanitizedUpdate;
      return next();
    } else {
      return next();
    }
  }
};
