const mongoose = require('mongoose');
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
  primary_location: {
    lat: 5,
    lon: 4,
  },
};

const userSeed2 = {
  email: 'bar@example.com',
  first_name: 'Rusty',
  last_name: 'Shakleford',
  password: 'foobar',
  last_login_date: new Date(),
  login_attempts: 5,
  avatar: 'http://example2.com',
  nested: {
    foo: 'bar',
    cant_see: 'yo',
  },
};

let userDocs;

const { permissions } = User.schema;

const levelPermissions = Object.assign({}, permissions);

delete levelPermissions.defaults;

mongoose.Promise = global.Promise;
mongoose.connect(dbUri, { useMongoClient: true });
mongoose.connection.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error(`Failed to connect to mongo at ${dbUri}`);
  // eslint-disable-next-line no-console
  console.error(`MongoDB connection error: ${err}`);
  throw err;
});

module.exports = {
  setUp: async (callback) => {
    try {
      // conveniently, these static methods go around our authorization hooks
      await User.remove({});

      const user1 = await new User(userSeed1).save({ authLevel: false });
      const user2 = await new User(userSeed2).save({ authLevel: false });
      user1.best_friend = user2;
      await user1.save({ authLevel: false });
      userDocs = [user1, user2];
      callback();
    } catch (err) {
      callback(err);
    }
  },
  Disable: {
    find: async (test) => {
      const users = await User.find().setAuthLevel(false).exec();
      test.ok(users);
      test.equal(users.length, 2);
      test.ok(users[0]);
      test.ok(users[0]._id);
      test.equals(
        users[0].beyond_permissions,
        'some value',
      );
      test.equal(users[0].full_name, 'Archer Sterling');
      test.done();
    },
    remove: async (test) => {
      try {
        await userDocs[0].remove({ authLevel: false });
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
        await user.save({ authLevel: false });
      } catch (err) {
        test.ifError(err);
      }

      test.ok(user);
      test.equal(user.email, newEmail);
      test.done();
    },
    create: async (test) => {
      try {
        const testCreation = new User({
          email: 'foobar@example.com',
          first_name: 'First',
          last_name: 'Lastingly',
          password: 'idk',
          last_login_date: new Date(),
          login_attempts: 67,
          avatar: 'http://someurl.com',
          primary_location: {
            lat: 5,
            lon: 4,
          },
        });
        await testCreation.save({ authLevel: false });
      } catch (err) {
        test.ifError(err);
      }
      test.done();
    },
  },
  'Removing Documents': {
    'Document#remove': {
      'no permission': async (test) => {
        test.expect(1);
        try {
          await userDocs[0].remove();
        } catch (err) {
          test.ok(err instanceof PermissionDeniedError);
        }

        test.done();
      },
      'explicit no': async (test) => {
        test.expect(1);
        try {
          await userDocs[0].remove({ authLevel: 'admin' });
        } catch (err) {
          test.ok(err instanceof PermissionDeniedError);
        }

        test.done();
      },
      'should allow': async (test) => {
        try {
          const user = await userDocs[0].remove({ authLevel: 'owner' });
          test.ok(user);
          const deletedUser = await User.findOne({ _id: user.id }).exec();
          test.ok(!deletedUser);
        } catch (err) {
          test.ifError(err);
        }
        test.done();
      },
    },
    findOneAndRemove: {

    },
  },
  'Creating Documents': {},
  'Finding Documents': {
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
    findOne: async (test) => {
      try {
        const user = await User.findOne({ email: 'foo@example.com' })
          .setAuthLevel('admin')
          .exec();
        test.ok(user);
        test.equal(user.status, 'active');
      } catch (err) {
        test.ifError(err);
      }
      test.done();
    },
    'with permissions option: true': async (test) => {
      const user = await User.findOne()
        .setOptions({ authLevel: 'admin', permissions: true })
        .exec();
      test.ok(user);
      test.deepEqual(
        user.permissions.read.sort(),
        ['_id', 'email', 'first_name', 'last_name', 'avatar', 'status', 'best_friend'].sort(),
      );
      test.deepEqual(
        user.permissions.write.sort(),
        ['status', 'primary_location'].sort(),
      );
      test.strictEqual(
        user.permissions.remove,
        false,
      );
      test.done();
    },
    'with permissions option: named': async (test) => {
      const user = await User.findOne()
        .setOptions({ authLevel: 'admin', permissions: 'perms' })
        .exec();
      test.ok(user);
      test.deepEqual(
        user.perms.read.sort(),
        ['_id', 'email', 'first_name', 'last_name', 'avatar', 'status', 'best_friend'].sort(),
      );
      test.deepEqual(
        user.perms.write.sort(),
        ['status', 'primary_location'].sort(),
      );
      test.strictEqual(
        user.perms.remove,
        false,
      );
      test.done();
    },
    'with permissions option (lean)': async (test) => {
      const user = await User.findOne()
        .setOptions({ authLevel: 'admin', permissions: true })
        .lean()
        .exec();
      test.ok(user);
      test.deepEqual(
        user.permissions.read.sort(),
        ['_id', 'email', 'first_name', 'last_name', 'avatar', 'status', 'best_friend'].sort(),
      );
      test.deepEqual(
        user.permissions.write.sort(),
        ['status', 'primary_location'].sort(),
      );
      test.strictEqual(
        user.permissions.remove,
        false,
      );
      test.done();
    },
    'nested document, top level': async (test) => {
      const user = await User
        .findOne({ email: 'bar@example.com' })
        .setAuthLevel('top_level_nested')
        .exec();

      test.equal(
        user.nested.foo,
        'bar',
        'should be able to read entire nested obj with access to top level key',
      );

      test.done();
    },
    'nested document, deep level': async (test) => {
      const user = await User
        .findOne({ email: 'bar@example.com' })
        .setAuthLevel('deep_nested_access')
        .exec();

      test.equal(
        user.nested.foo,
        'bar',
        'should be able to read specific key in nested object',
      );

      test.equal(
        user.nested.cant_see,
        undefined,
        'should not be able to read specific sub-object key not in permissions',
      );

      test.done();
    },
  },
  'Saving Documents': {
    'no permissions passed': async (test) => {
      test.expect(1);
      userDocs[0].status = 'disabled';
      try {
        await userDocs[0].save();
      } catch (err) {
        test.equals(err.name, 'PermissionDenied');
      }

      test.done();
    },
    'wrong permissions passed': async (test) => {
      test.expect(1);
      userDocs[0].status = 'disabled';
      try {
        await userDocs[0].save({ authLevel: 'owner' });
      } catch (err) {
        test.equals(err.name, 'PermissionDenied');
      }

      test.done();
    },
    'correct permissions passed': async (test) => {
      test.expect(1);
      userDocs[0].status = 'disabled';
      await userDocs[0].save({ authLevel: 'admin' });
      test.equals(userDocs[0].status, 'disabled');
      test.done();
    },
  },
  'Updating Documents': {
    'no permissions passed': async (test) => {
      test.expect(1);
      try {
        await User.update(
          { _id: userDocs[0]._id },
          { status: 'disabled' },
        );
      } catch (err) {
        test.equals(err.name, 'PermissionDenied');
      }

      test.done();
    },
    'wrong permissions passed': async (test) => {
      test.expect(1);
      try {
        await User.update(
          { _id: userDocs[0]._id },
          { status: 'disabled' },
          { authLevel: 'owner' },
        );
      } catch (err) {
        test.equals(err.name, 'PermissionDenied');
      }
      test.done();
    },
    'correct permission passed': async (test) => {
      const updateStatus = await User.update(
        { _id: userDocs[0]._id },
        { status: 'disabled' },
        { authLevel: 'admin' },
      );
      test.ok(updateStatus);
      test.equals(updateStatus.n, 1);
      test.done();
    },
    findOneAndUpdate: async (test) => {
      const user = await User.findOneAndUpdate(
        { _id: userDocs[0]._id },
        { status: 'disabled' },
        { authLevel: 'admin' },
      );
      test.equals(user.status, 'active');
      test.deepEqual(user.toJSON(), {
        _id: user._id,
        email: 'foo@example.com',
        first_name: 'Archer',
        last_name: 'Sterling',
        avatar: 'http://someurl.com',
        best_friend: user.best_friend,
        status: 'active',
      });

      test.done();
    },
    'findOneAndUpdate with `new` option': async (test) => {
      const user = await User.findOneAndUpdate(
        { _id: userDocs[0]._id },
        { status: 'disabled' },
        { new: true, authLevel: 'admin' },
      );
      test.equals(user.status, 'disabled');
      test.done();
    },
  },
  'Sub Schemas': {
    create: {
      allowed: async (test) => {
        const user = userDocs[1];
        user.primary_location = { lat: 2, lon: 2 };
        try {
          await user.save({ authLevel: 'admin' });
        } catch (err) {
          test.ifError(err);
        }
        test.done();
      },
      'not allowed': async (test) => {
        test.expect(1);
        const user = userDocs[1];
        user.primary_location = { lat: 2, lon: 2 };
        try {
          await user.save({ authLevel: 'owner' });
        } catch (err) {
          test.ok(err instanceof PermissionDeniedError);
        }
        test.done();
      },
    },
  },
  'Population Propagation': {
    'permissions only at top level': async (test) => {
      const users = await User
        .find({ email: 'foo@example.com' })
        .setAuthLevel('admin')
        .populate('best_friend')
        .exec();

      // make sure permission are applied to top level, but don't trickle down
      test.deepEqual(users[0].toJSON(), {
        _id: users[0]._id,
        email: 'foo@example.com',
        first_name: 'Archer',
        last_name: 'Sterling',
        avatar: 'http://someurl.com',
        status: 'active',
        best_friend: {
          _id: users[0].best_friend._id,
          email: 'bar@example.com',
          first_name: 'Rusty',
          last_name: 'Shakleford',
          avatar: 'http://example2.com',
        },
      });

      test.done();
    },
    'permissions explicitly passed down': async (test) => {
      const users = await User
        .find({ email: 'foo@example.com' })
        .setAuthLevel('admin')
        .populate({
          path: 'best_friend',
          options: { authLevel: 'admin' },
        })
        .exec();

      // make sure permission are applied to top level, but don't trickle down
      test.deepEqual(users[0].toJSON(), {
        _id: users[0]._id,
        email: 'foo@example.com',
        first_name: 'Archer',
        last_name: 'Sterling',
        avatar: 'http://someurl.com',
        status: 'active',
        best_friend: {
          _id: users[0].best_friend._id,
          email: 'bar@example.com',
          first_name: 'Rusty',
          last_name: 'Shakleford',
          avatar: 'http://example2.com',
          status: 'active',
        },
      });

      test.done();
    },
    'permissions explicitly disabled on lower level': async (test) => {
      const users = await User
        .find({ email: 'foo@example.com' })
        .setAuthLevel('admin')
        .populate({
          path: 'best_friend',
          options: { authLevel: false },
        })
        .exec();

      // make sure permission are applied to top level, but don't trickle down
      test.deepEqual(users[0].toJSON(), {
        _id: users[0]._id,
        email: 'foo@example.com',
        first_name: 'Archer',
        last_name: 'Sterling',
        avatar: 'http://someurl.com',
        status: 'active',
        best_friend: userDocs[1].toJSON(),
      });

      test.done();
    },
  },
};

