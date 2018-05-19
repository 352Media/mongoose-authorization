"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose = require("mongoose");
var helpers_1 = require("../src/helpers");
var AuthorizationSchema_1 = require("../src/AuthorizationSchema");
// Set up a bunch of schemas for testing. We're not going to connect to the database
// since these tests only depend on the schema definitions.
var goodSchema = new AuthorizationSchema_1.AuthorizationSchema({
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
    return "virtual" + this.name;
});
goodSchema.getAuthLevel = function getAuthLevel(payload) {
    return payload && payload.authLevel;
};
var bareBonesSchema = new AuthorizationSchema_1.AuthorizationSchema({});
bareBonesSchema.permissions = {
    admin: {
        read: ['address', 'phone', 'birthday', 'does_not_exist'],
        write: ['address', 'phone', 'birthday', 'not_here_either'],
        create: true,
        remove: true,
    },
};
var emptySchema = new mongoose.Schema({});
// Options Configs
var queryOpt = { authLevel: 'admin' };
module.exports = {
    resolveAuthLevel: {
        'single in query options': function (test) {
            // Single Auth level in query options
            test.deepEqual(helpers_1.resolveAuthLevel(goodSchema, queryOpt), ['admin', 'defaults']);
            test.done();
        },
        'unknown in query options': function (test) {
            test.deepEqual(helpers_1.resolveAuthLevel(goodSchema, { authLevel: 'foobar' }), ['defaults']);
            test.deepEqual(helpers_1.resolveAuthLevel(goodSchema, { authLevel: ['foobar', 'self'] }), ['self', 'defaults']);
            test.deepEqual(helpers_1.resolveAuthLevel(bareBonesSchema, { authLevel: ['foobar'] }), []);
            test.deepEqual(helpers_1.resolveAuthLevel(bareBonesSchema, { authLevel: 'default' }), []);
            test.done();
        },
        'bad schema': function (test) {
            test.deepEqual(helpers_1.resolveAuthLevel(emptySchema, { authLevel: 'admin' }), []);
            test.done();
        },
        'multiple in query options': function (test) {
            test.deepEqual(helpers_1.resolveAuthLevel(goodSchema, { authLevel: ['self', 'admin'] }), ['self', 'admin', 'defaults']);
            test.deepEqual(helpers_1.resolveAuthLevel(goodSchema, { authLevel: ['defaults'] }), ['defaults']);
            test.deepEqual(helpers_1.resolveAuthLevel(goodSchema, { authLevel: ['self', 'admin', 'self', 'default', 'admin'] }), ['self', 'admin', 'defaults']);
            test.done();
        },
        'from document getAuthLevel': function (test) {
            test.deepEqual(helpers_1.resolveAuthLevel(goodSchema, {}, { foo: 1 }), ['defaults']);
            test.deepEqual(helpers_1.resolveAuthLevel(goodSchema, { authPayload: { authLevel: 'admin' } }, { foo: 1 }), ['admin', 'defaults']);
            test.deepEqual(helpers_1.resolveAuthLevel(goodSchema, { authPayload: { authLevel: false } }, { foo: 1 }), ['defaults']);
            test.deepEqual(helpers_1.resolveAuthLevel(goodSchema, {
                authPayload: { authLevel: 'self' },
                authLevel: 'admin'
            }, { foo: 1 }), ['admin', 'defaults']);
            test.deepEqual(helpers_1.resolveAuthLevel(goodSchema, { authPayload: { authLevel: 'self' } }), ['self', 'defaults']);
            test.done();
        },
    },
    getAuthorizedFields: function (test) {
        test.deepEqual(helpers_1.getAuthorizedFields(bareBonesSchema, { authLevel: 'foobar' }, 'read'), []);
        test.deepEqual(helpers_1.getAuthorizedFields(goodSchema, { authLevel: 'foobar' }, 'read').sort(), ['_id', 'name'].sort());
        test.deepEqual(helpers_1.getAuthorizedFields(goodSchema, { authLevel: 'admin' }, 'read').sort(), ['_id', 'name', 'address', 'phone', 'birthday'].sort());
        test.deepEqual(helpers_1.getAuthorizedFields(goodSchema, { authLevel: 'stranger' }, 'read').sort(), ['_id', 'name'].sort());
        test.deepEqual(helpers_1.getAuthorizedFields(goodSchema, { authLevel: ['self', 'admin'] }, 'read').sort(), ['_id', 'name', 'address', 'phone', 'birthday'].sort());
        test.deepEqual(helpers_1.getAuthorizedFields(goodSchema, { authLevel: 'self' }, 'write').sort(), ['address', 'phone'].sort());
        test.deepEqual(helpers_1.getAuthorizedFields(bareBonesSchema, { authLevel: 'admin' }, 'write'), []);
        test.deepEqual(helpers_1.getAuthorizedFields(goodSchema, { authLevel: 'hasVirtuals' }, 'read').sort(), ['_id', 'name', 'virtual_name'].sort(), 'virtuals should be included in the list of fields');
        test.deepEqual(helpers_1.getAuthorizedFields(goodSchema, { authLevel: 'nested_top' }, 'read').sort(), ['_id', 'name', 'nested'].sort(), 'top level nested field should be ok as authorized field');
        test.deepEqual(helpers_1.getAuthorizedFields(goodSchema, { authLevel: 'nested_deep' }, 'read').sort(), ['_id', 'name', 'nested.thing'].sort(), 'deeply nested field should be ok as authorized field');
        test.done();
    },
    hasPermission: function (test) {
        test.equal(helpers_1.hasPermission(bareBonesSchema, undefined, 'create'), false, 'should return false when no options provided');
        test.equal(helpers_1.hasPermission(bareBonesSchema, {}, 'create'), false, 'should return false when no permissions exist');
        test.equal(helpers_1.hasPermission(goodSchema, {}, 'create'), false, 'default write permission not respected when no authLevel specified');
        test.equal(helpers_1.hasPermission(goodSchema, {}, 'create'), false, 'should return false when no permission has been set for the action');
        test.equal(helpers_1.hasPermission(goodSchema, { authLevel: 'admin' }, 'create'), true, 'should return true when an AuthLevel says so, despite default');
        test.done();
    },
    authIsDisabled: function (test) {
        // TODO fill in
        test.done();
    },
    embedPermissions: function (test) {
        // TODO fill in
        test.done();
    },
    sanitizeDocument: function (test) {
        // TODO fill in
        test.done();
    },
    sanitizeDocumentList: function (test) {
        // TODO fill in
        test.done();
    },
    getUpdatePaths: function (test) {
        test.deepEqual(helpers_1.getUpdatePaths({ $set: { foo: 1 } }).sort(), ['foo']);
        test.deepEqual(helpers_1.getUpdatePaths({ $set: { foo: 1 }, $inc: { bar: 2 } }).sort(), ['bar', 'foo']);
        test.deepEqual(helpers_1.getUpdatePaths({ foo: 1, bar: 2 }).sort(), ['bar', 'foo']);
        test.done();
    },
};
//# sourceMappingURL=helpers.test.js.map