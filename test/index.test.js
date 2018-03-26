const mongoose = require('mongoose');
const lodash = require('lodash');
const User = require('./user.schema');
const PermissionDeniedError = require('../lib/PermissionDeniedError');

const dbUri = 'mongodb://localhost:27017/mongooseAuthorization';

const userSeed1 = {
  email: 'foo@example.com',
  first_name: 'Archer',
  last_name: 'Sterling',
  password: 'guest',
  last_login_date: new Date(),
  login_attempts: 1,
  avatar: 'http://someurl.com',
};

const userSeed2 = {
  email: 'bar@example.com',
  first_name: 'Rusty',
  last_name: 'Shakleford',
  password: 'foobar',
  last_login_date: new Date(),
  login_attempts: 5,
  avatar: 'http://example2.com',
};

let userVals1, userVals2;

const permissions = User.schema.permissions;

const levelPermissions = Object.assign({}, permissions);

delete levelPermissions.defaults;

mongoose.Promise = global.Promise;
mongoose.connect(dbUri, { useMongoClient: true });
mongoose.connection.on('error', (err) => {
  console.error(`Failed to connect to mongo at ${dbUri}`);
  console.error(`MongoDB connection error: ${err}`);
  throw err;
});

module.exports = {
  setUp: (callback) => {
    // conveniently, these static methods go around our authorization hooks
    User.remove({})
      .then(() => {
        User.disableAuthorization();
        return User.create([userSeed1, userSeed2]);
      }).
      then((users) => {
        User.enableAuthorization();
        userVals1 = users[0].toJSON();
        userVals2 = users[1].toJSON();
      })
      .then(callback)
      .catch(callback);
  },
  'Global Disable': {
    setUp: (callback) => {
      User.disableAuthorization();
      callback();
    },
    find: (test) => {
      User.find().exec()
        .then((users) => {
          test.ok(users);
          test.equal(users.length, 2);
          test.ok(users[0]);
          test.ok(users[0]._id);
          test.equals(
            users[0].beyond_permissions,
            'some value'
          );
          test.done();
        });
    },
    remove: (test) => {
      User.findOne({ email: 'foo@example.com'}).exec()
        .then((user) => user.remove())
        .catch(test.ifError)
        .then(() => test.done());
    },
    save: (test) => {
      const newEmail = 'new@updated.com';
      User.findOne({ email: 'foo@example.com'}).exec()
        .then((user) => {
          user.email = newEmail;
          return user.save();
        })
        .then((user) => {
          test.ok(user);
          test.equal(user.email, newEmail);
          test.done();
        })
        .catch(test.ifError);
    },
    tearDown : (callback) => {
      User.enableAuthorization();
      callback();
    },
  },
  'Removing Documents': {
    'Document#remove': {
      'no permission': (test) => {
        test.expect(1);
        User.findOne({ email: 'foo@example.com'}).exec()
          .then((user) => user.remove())
          .catch((err) => {
            test.ok(err instanceof PermissionDeniedError);
          })
          .then(() => test.done());
      },
      'explicit no': (test) => {
        test.expect(1);
        User.findOne({ email: 'foo@example.com'}).exec()
          .then((user) => user.remove({ authLevel: 'admin'}))
          .catch((err) => {
            test.ok(err instanceof PermissionDeniedError);
          })
          .then(() => test.done());
      },
      'should allow': (test) => {
        User.findOne().exec()
          .then((user) => user.remove({ authLevel: 'owner'}))
          .then((user) => {
            test.ok(user);
            test.equal(user.status, undefined);
          })
          .catch(test.ifError)
          .then(() => test.done());
      },
    },
    'findOneAndRemove': {

    },
    'Model.find().remove()': {

    },
  },
  'Finding Docs': {
    'Basic Field Filtering': (test) => {
      User.find().exec()
        .then((users) => {
          test.ok(users);
          test.equal(users.length, 2);
          test.equal(users[0].status, undefined);
          test.done();
        })
        .catch(test.ifError);
    },
    'Never see docs we have no access to': (test) => {
      User.find().exec()
        .then((users) => {
          test.ok(users);
          test.equal(users.length, 2);
          test.equal(users[0].status, undefined);
          test.done();
        })
        .catch(test.ifError);
    },
  },
  'sub schemas': {},
/*
  'should only return projection for authLevel merged with defaults': function (test) {
    function testAuthLevel(fields, level, callback) {
      fields = fields.read.concat(permissions.defaults.read);
      User.findOne({}, null, { authLevel: level })
        .exec()
        .then((user) => {
          test.ok(user);

          fields.forEach((field) => {
            test.deepEqual(user[field], userValues[field]);
          });

          const returnedKeys = Object.keys(user.toJSON());
          test.equal(lodash.difference(returnedKeys, fields).length, 0);

          callback();
        }).catch(callback);
    }

    async.forEachOf(levelPermissions, testAuthLevel, test.done);
  },

  'should work with query extension function': function (test) {
    function testAuthLevel(fields, level, callback) {
      fields = fields.read.concat(permissions.defaults.read);
      User.findOne({})
        .setAuthLevel(level)
        .exec()
        .then((user) => {
          test.ok(user);

          fields.forEach((field) => {
            test.deepEqual(user[field], userValues[field]);
          });

          const returnedKeys = Object.keys(user.toJSON());
          test.equal(lodash.difference(returnedKeys, fields).length, 0);

          callback();
        })
        .catch(callback);
    }

    async.forEachOf(levelPermissions, testAuthLevel, test.done);
  },
*/

};

