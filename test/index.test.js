'use strict';

var mongoose = require('mongoose');
var lodash = require('lodash');
var async = require('async');
var User = require('./user.schema');

var dbUri = 'mongodb://localhost:27017/mongooseAuthorization';

var userSeed = {
    email: 'foo@test.com',
    first_name: 'Archer',
    last_name: 'Sterling',
    password: 'guest',
    last_login_date: new Date(),
    login_attempts: 1,
    avatar: 'http://someurl.com'
  };

var userValues;

var permissions = User.schema.permissions;

var levelPermissions = Object.assign({}, permissions);

delete levelPermissions.defaults;

mongoose.connect(dbUri);
mongoose.connection.on('error', function(err) {
    console.error('Failed to connect to mongo at ' + dbUri);
    console.error('MongoDB connection error: ' + err);
    throw err;
  });

module.exports = {
    setUp: function(callback) {
        User.remove({}, function(error) {
            if (error) {
              callback(error);
            }

            User.create(userSeed, function(error, user) {
                userValues = user.toJSON();
                callback(error);
              });
          });
      },

    'should return everything for no authLevel': function(test) {
        User.findOne({})
            .exec()
            .then(function(user) {
                test.ok(user);

                Object.keys(userValues).forEach(function(pathKey) {
                    test.deepEqual(user[pathKey], userValues[pathKey]);
                  });

                test.done();
              }).catch(test.done);
      },

    'should only return projection for authLevel merged with defaults': function(test) {

        function testAuthLevel(fields, level, callback) {
          fields = fields.read.concat(permissions.defaults.read);
          User.findOne({}, null, {authLevel: level})
              .exec()
              .then(function(user) {
                  test.ok(user);

                  fields.forEach(function(field) {
                      test.deepEqual(user[field], userValues[field]);
                    });

                  var returnedKeys = Object.keys(user.toJSON());
                  test.equal(lodash.difference(returnedKeys, fields).length, 0);

                  callback();
                }).catch(callback);
        }

        async.forEachOf(levelPermissions, testAuthLevel, test.done);
      },

    'should work with query extension function': function(test) {

        function testAuthLevel(fields, level, callback) {
          fields = fields.read.concat(permissions.defaults.read);
          User.findOne({})
              .setAuthLevel(level)
              .exec()
              .then(function(user) {
                  test.ok(user);

                  fields.forEach(function(field) {
                      test.deepEqual(user[field], userValues[field]);
                    });

                  var returnedKeys = Object.keys(user.toJSON());
                  test.equal(lodash.difference(returnedKeys, fields).length, 0);

                  callback();
                }).catch(callback);
        }

        async.forEachOf(levelPermissions, testAuthLevel, test.done);
      },

    'should merge authLevels if they are arrays': function(test) {
        User.findOne({}, null, {authLevel: ['admin', 'owner']})
            .exec()
            .then(function(user) {
                test.ok(user);

                var fields = levelPermissions.admin.read.concat(
                    levelPermissions.owner.read
                ).concat(permissions.defaults.read);

                fields.forEach(function(field) {
                    console.log(field, ' : ', user[field]);
                    test.deepEqual(user[field], userValues[field]);
                  });

                var returnedKeys = Object.keys(user.toJSON());
                test.equal(lodash.difference(returnedKeys, fields).length, 0);

                test.done();
              }).catch(test.done);
      }
  };

