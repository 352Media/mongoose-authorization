const mongoose = require('mongoose');

const {
  resolveAuthLevel,
  getAuthorizedFields,
  hasPermission,
  getUpdatePaths,
} = require('../lib/helpers');

// Set up a bunch of schemas for testing. We're not going to connect to the database
// since these tests only depend on the schema definitions.
const goodSchema = new mongoose.Schema({
  name: String,
  address: String,
  phone: String,
  birthday: String,
  nested: { thing: String },
});
goodSchema.permissions = {
  defaults: {
    read: ['_id', 'name'],
    write: [],
    create: false,
  },
  admin: {
    read: ['address', 'phone', 'birthday'],
    write: ['address', 'phone', 'birthday'],
    create: true,
    remove: true,
  },
  self: {
    read: ['address', 'phone', 'birthday'],
    write: ['address', 'phone'],
  },
  stranger: {},
  hasVirtuals: {
    read: ['virtual_name'],
  },
  nested_top: {
    read: ['nested'],
  },
  nested_deep: {
    read: ['nested.thing'],
  },
};
goodSchema.virtual('virtual_name').get(function getVirtualName() {
  return `virtual${this.name}`;
});
goodSchema.getAuthLevel = function getAuthLevel(payload) {
  return payload && payload.authLevel;
};

const bareBonesSchema = new mongoose.Schema({});
bareBonesSchema.permissions = {
  admin: {
    read: ['address', 'phone', 'birthday', 'does_not_exist'],
    write: ['address', 'phone', 'birthday', 'not_here_either'],
    create: true,
    remove: true,
  },
};

const emptySchema = new mongoose.Schema({});

// Options Configs
const queryOpt = { authLevel: 'admin' };

module.exports = {
  resolveAuthLevel: {
    'single in query options': (test) => {
      // Single Auth level in query options
      test.deepEqual(
        resolveAuthLevel(goodSchema, queryOpt),
        ['admin', 'defaults'],
      );

      test.done();
    },
    'unknown in query options': (test) => {
      test.deepEqual(
        resolveAuthLevel(goodSchema, { authLevel: 'foobar' }),
        ['defaults'],
      );
      test.deepEqual(
        resolveAuthLevel(goodSchema, { authLevel: ['foobar', 'self'] }),
        ['self', 'defaults'],
      );
      test.deepEqual(
        resolveAuthLevel(bareBonesSchema, { authLevel: ['foobar'] }),
        [],
      );
      test.deepEqual(
        resolveAuthLevel(bareBonesSchema, { authLevel: 'default' }),
        [],
      );
      test.done();
    },
    'bad schema': (test) => {
      test.deepEqual(
        resolveAuthLevel(emptySchema, { authLevel: 'admin' }),
        [],
      );
      test.done();
    },
    'multiple in query options': (test) => {
      test.deepEqual(
        resolveAuthLevel(goodSchema, { authLevel: ['self', 'admin'] }),
        ['self', 'admin', 'defaults'],
      );
      test.deepEqual(
        resolveAuthLevel(goodSchema, { authLevel: ['defaults'] }),
        ['defaults'],
      );
      test.deepEqual(
        resolveAuthLevel(goodSchema, { authLevel: ['self', 'admin', 'self', 'default', 'admin'] }),
        ['self', 'admin', 'defaults'],
      );
      test.done();
    },
    'from document getAuthLevel': (test) => {
      test.deepEqual(
        resolveAuthLevel(goodSchema, { authPayload: { authLevel: 'admin' } }, { foo: 1 }),
        ['admin', 'defaults'],
      );
      test.deepEqual(
        resolveAuthLevel(goodSchema, { authPayload: { authLevel: false } }, { foo: 1 }),
        ['defaults'],
      );
      test.deepEqual(
        resolveAuthLevel(goodSchema, { authPayload: { authLevel: 'self' }, authLevel: 'admin' }, { foo: 1 }),
        ['admin', 'defaults'],
      );
      test.done();
    },
    'missing authPayload': (test) => {
      test.expect(1);
      try {
        resolveAuthLevel(goodSchema, {}, {});
      } catch(err) {
        test.ok(err);
      }

      test.done();
    },
    'missing doc': (test) => {
      test.expect(1);
      try {
        resolveAuthLevel(goodSchema, { authPayload: 'foo' }, false);
      } catch(err) {
        test.ok(err);
      }

      test.done();
    },
  },
  getAuthorizedFields(test) {
    test.deepEqual(
      getAuthorizedFields(bareBonesSchema, { authLevel: 'foobar' }, 'read'),
      [],
    );
    test.deepEqual(
      getAuthorizedFields(goodSchema, { authLevel: 'foobar' }, 'read').sort(),
      ['_id', 'name'].sort(),
    );
    test.deepEqual(
      getAuthorizedFields(goodSchema, { authLevel: 'admin' }, 'read').sort(),
      ['_id', 'name', 'address', 'phone', 'birthday'].sort(),
    );
    test.deepEqual(
      getAuthorizedFields(goodSchema, { authLevel: 'stranger' }, 'read').sort(),
      ['_id', 'name'].sort(),
    );
    test.deepEqual(
      getAuthorizedFields(goodSchema, { authLevel: ['self', 'admin'] }, 'read').sort(),
      ['_id', 'name', 'address', 'phone', 'birthday'].sort(),
    );
    test.deepEqual(
      getAuthorizedFields(goodSchema, { authLevel: 'self' }, 'write').sort(),
      ['address', 'phone'].sort(),
    );
    test.deepEqual(
      getAuthorizedFields(bareBonesSchema, { authLevel: 'admin' }, 'write'),
      [],
    );
    test.deepEqual(
      getAuthorizedFields(goodSchema, { authLevel: 'hasVirtuals' }, 'read').sort(),
      ['_id', 'name', 'virtual_name'].sort(),
      'virtuals should be included in the list of fields',
    );
    test.deepEqual(
      getAuthorizedFields(goodSchema, { authLevel: 'nested_top' }, 'read').sort(),
      ['_id', 'name', 'nested'].sort(),
      'top level nested field should be ok as authorized field',
    );
    test.deepEqual(
      getAuthorizedFields(goodSchema, { authLevel: 'nested_deep' }, 'read').sort(),
      ['_id', 'name', 'nested.thing'].sort(),
      'deeply nested field should be ok as authorized field',
    );

    test.done();
  },
  hasPermission(test) {
    test.equal(
      hasPermission(bareBonesSchema, undefined, 'create'),
      false,
      'should return false when no options provided',
    );
    test.equal(
      hasPermission(bareBonesSchema, {}, 'create'),
      false,
      'should return false when no permissions exist',
    );
    test.equal(
      hasPermission(goodSchema, { authLevel: 'admin' }, 'create'),
      true,
      'should return true when an AuthLevel says so, despite default',
    );
    test.done();
  },
  authIsDisabled(test) {
    // TODO fill in
    test.done();
  },
  embedPermissions(test) {
    // TODO fill in
    test.done();
  },
  sanitizeDocument(test) {
    // TODO fill in
    test.done();
  },
  sanitizeDocumentList(test) {
    // TODO fill in
    test.done();
  },
  getUpdatePaths(test) {
    test.deepEqual(
      getUpdatePaths({ $set: { foo: 1 } }).sort(),
      ['foo'],
    );
    test.deepEqual(
      getUpdatePaths({ $set: { foo: 1 }, $inc: { bar: 2 } }).sort(),
      ['bar', 'foo'],
    );
    test.deepEqual(
      getUpdatePaths({ foo: 1, bar: 2 }).sort(),
      ['bar', 'foo'],
    );
    test.done();
  },
};

