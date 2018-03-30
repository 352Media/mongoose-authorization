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

let userVals1, userVals2, userDocs;

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
  setUp: async (callback) => {
    try {
      // conveniently, these static methods go around our authorization hooks
      await User.remove({});

      User.disableAuthorization();
      const users = await User.create([userSeed1, userSeed2]);
      User.enableAuthorization();
      userVals1 = users[0].toJSON();
      userVals2 = users[1].toJSON();
      userDocs = users;
      callback();
    } catch (err) {
      callback(err);
    }
  },
  'Global Disable': {
    setUp: (callback) => {
      User.disableAuthorization();
      callback();
    },
    find: async (test) => {
      const users = await User.find().exec();
      test.ok(users);
      test.equal(users.length, 2);
      test.ok(users[0]);
      test.ok(users[0]._id);
      test.equals(
        users[0].beyond_permissions,
        'some value'
      );
      test.equal(users[0].full_name, 'Archer Sterling');
      test.done();
    },
    remove: async (test) => {
      try {
        await userDocs[0].remove();
      } catch (err) {
        test.ifError(err);
      }

      test.done();
    },
    save: async (test) => {
      const newEmail = 'new@updated.com';
      const user = userDocs[0];
      user.email = newEmail;

      try {
        await user.save();
      } catch (err) {
        test.ifError(err);
      }

      test.ok(user);
      test.equal(user.email, newEmail);
      test.done();
    },
    'create': (test) => {
      // TODO fill in
      test.done();
    },
    tearDown : (callback) => {
      User.enableAuthorization();
      callback();
    },
  },
  'Removing Documents': {
    'Document#remove': {
      'no permission': async (test) => {
        test.expect(1);
        try {
          await userDocs[0].remove();
        } catch(err) {
          test.ok(err instanceof PermissionDeniedError);
        }

        test.done();
      },
      'explicit no': async (test) => {
        test.expect(1);
        try {
          await userDocs[0].remove({ authLevel: 'admin'});
        } catch(err) {
          test.ok(err instanceof PermissionDeniedError);
        }

        test.done();
      },
      'should allow': async (test) => {
        try {
          const user = await userDocs[0].remove({ authLevel: 'owner' });
          test.ok(user);
          const deletedUser = await User.findOne({_id: user.id}).exec();
          test.ok(!deletedUser);
        } catch(err) {
          test.ifError(err);
        }
        test.done();
      },
    },
    'findOneAndRemove': {

    },
    'Model.find().remove()': {

    },
  },
  'Finding Docs': {
    'Basic Field Filtering': async (test) => {
      try {
        const users = await User.find().exec();
        test.ok(users);
        test.equal(users.length, 2);
        test.equal(users[0].status, undefined);
        test.equal(users[0].full_name, undefined);
      } catch (err) {
        test.ifError(err);
      }
      test.done();
    },
    'Basic Field Filtering (lean)': async (test) => {
      try {
        const users = await User.find().lean().exec();
        test.ok(users);
        test.equal(users.length, 2);
        test.equal(users[0].status, undefined);
        test.equal(users[0].full_name, undefined);
      } catch (err) {
        test.ifError(err);
      }
      test.done();
    },
    'Never see docs we have no access to': async (test) => {
      // TODO replace with a model where there are no defaults
      try {
        const users = await User.find().exec();
        test.ok(users);
        test.equal(users.length, 2);
        test.equal(users[0].status, undefined);
      } catch (err) {
        test.ifError(err);
      }
      test.done();
    },
    'Filtered Fields': async (test) => {
      try {
        const users = await User.find().setAuthLevel(['admin', 'owner']).exec();
        test.ok(users);
        test.equal(users.length, 2);
        test.equal(users[0].status, 'active');
        test.equal(users[0].full_name, 'Archer Sterling');
      } catch (err) {
        test.ifError(err);
      }
      test.done();
    },
    'Filtered Fields (lean)': async (test) => {
      try {
        const users = await User.find()
          .setAuthLevel(['admin', 'owner'])
          .lean()
          .exec();
        test.ok(users);
        test.equal(users.length, 2);
        test.equal(users[0].status, 'active');
      } catch (err) {
        test.ifError(err);
      }
      test.done();
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

