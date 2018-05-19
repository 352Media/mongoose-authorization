"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose = require("mongoose");
var PermissionDeniedError = require("../src/PermissionDeniedError");
var user_schema_1 = require("./user.schema");
var dbUri = 'mongodb://localhost:27017/mongooseAuthorization';
var userSeed1 = {
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
var userSeed2 = {
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
var userDocs;
var permissions = user_schema_1.User.schema.permissions;
var levelPermissions = Object.assign({}, permissions);
delete levelPermissions.defaults;
mongoose.connect(dbUri, { useMongoClient: true });
mongoose.connection.on('error', function (err) {
    // tslint:disable-next-line
    console.error("Failed to connect to mongo at " + dbUri);
    // tslint:disable-next-line
    console.error("MongoDB connection error: " + err);
    throw err;
});
module.exports = {
    'setUp': function (callback) { return __awaiter(_this, void 0, void 0, function () {
        var user1, user2, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    // conveniently, these static methods go around our authorization hooks
                    return [4 /*yield*/, user_schema_1.User.remove({})];
                case 1:
                    // conveniently, these static methods go around our authorization hooks
                    _a.sent();
                    return [4 /*yield*/, new user_schema_1.User(userSeed1).save({ authLevel: false })];
                case 2:
                    user1 = _a.sent();
                    return [4 /*yield*/, new user_schema_1.User(userSeed2).save({ authLevel: false })];
                case 3:
                    user2 = _a.sent();
                    user1.best_friend = user2;
                    return [4 /*yield*/, user1.save({ authLevel: false })];
                case 4:
                    _a.sent();
                    userDocs = [user1, user2];
                    callback();
                    return [3 /*break*/, 6];
                case 5:
                    err_1 = _a.sent();
                    callback(err_1);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    }); },
    'Disable': {
        find: function (test) { return __awaiter(_this, void 0, void 0, function () {
            var users;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, user_schema_1.User.find().setAuthLevel(false).exec()];
                    case 1:
                        users = _a.sent();
                        test.ok(users);
                        test.equal(users.length, 2);
                        test.ok(users[0]);
                        test.ok(users[0]._id);
                        test.equals(users[0].beyond_permissions, 'some value');
                        test.equal(users[0].full_name, 'Archer Sterling');
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
        remove: function (test) { return __awaiter(_this, void 0, void 0, function () {
            var err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, userDocs[0].remove({ authLevel: false })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        err_2 = _a.sent();
                        test.ifError(err_2);
                        return [3 /*break*/, 3];
                    case 3:
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
        save: function (test) { return __awaiter(_this, void 0, void 0, function () {
            var newEmail, user, err_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        newEmail = 'new@updated.com';
                        user = userDocs[0];
                        user.email = newEmail;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, user.save({ authLevel: false })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_3 = _a.sent();
                        test.ifError(err_3);
                        return [3 /*break*/, 4];
                    case 4:
                        test.ok(user);
                        test.equal(user.email, newEmail);
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
        create: function (test) { return __awaiter(_this, void 0, void 0, function () {
            var testCreation, err_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        testCreation = new user_schema_1.User({
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
                        return [4 /*yield*/, testCreation.save({ authLevel: false })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        err_4 = _a.sent();
                        test.ifError(err_4);
                        return [3 /*break*/, 3];
                    case 3:
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
    },
    'Removing Documents': {
        'Document#remove': {
            'no permission': function (test) { return __awaiter(_this, void 0, void 0, function () {
                var err_5;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            test.expect(1);
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, userDocs[0].remove()];
                        case 2:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            err_5 = _a.sent();
                            test.ok(err_5 instanceof PermissionDeniedError);
                            return [3 /*break*/, 4];
                        case 4:
                            test.done();
                            return [2 /*return*/];
                    }
                });
            }); },
            'explicit no': function (test) { return __awaiter(_this, void 0, void 0, function () {
                var err_6;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            test.expect(1);
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, userDocs[0].remove({ authLevel: 'admin' })];
                        case 2:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            err_6 = _a.sent();
                            test.ok(err_6 instanceof PermissionDeniedError);
                            return [3 /*break*/, 4];
                        case 4:
                            test.done();
                            return [2 /*return*/];
                    }
                });
            }); },
            'should allow': function (test) { return __awaiter(_this, void 0, void 0, function () {
                var user, deletedUser, err_7;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            return [4 /*yield*/, userDocs[0].remove({ authLevel: 'owner' })];
                        case 1:
                            user = _a.sent();
                            test.ok(user);
                            return [4 /*yield*/, user_schema_1.User.findOne({ _id: user.id }).exec()];
                        case 2:
                            deletedUser = _a.sent();
                            test.ok(!deletedUser);
                            return [3 /*break*/, 4];
                        case 3:
                            err_7 = _a.sent();
                            test.ifError(err_7);
                            return [3 /*break*/, 4];
                        case 4:
                            test.done();
                            return [2 /*return*/];
                    }
                });
            }); },
        },
        'findOneAndRemove': {},
    },
    'Creating Documents': {},
    'Finding Documents': {
        'Basic Field Filtering': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var users, err_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, user_schema_1.User.find().exec()];
                    case 1:
                        users = _a.sent();
                        test.ok(users);
                        test.equal(users.length, 2);
                        test.equal(users[0].status, undefined);
                        test.equal(users[0].full_name, undefined);
                        return [3 /*break*/, 3];
                    case 2:
                        err_8 = _a.sent();
                        test.ifError(err_8);
                        return [3 /*break*/, 3];
                    case 3:
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
        'Basic Field Filtering (lean)': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var users, err_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, user_schema_1.User.find().lean().exec()];
                    case 1:
                        users = _a.sent();
                        test.ok(users);
                        test.equal(users.length, 2);
                        test.equal(users[0].status, undefined);
                        test.equal(users[0].full_name, undefined);
                        return [3 /*break*/, 3];
                    case 2:
                        err_9 = _a.sent();
                        test.ifError(err_9);
                        return [3 /*break*/, 3];
                    case 3:
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
        'Never see docs we have no access to': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var users, err_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, user_schema_1.User.find().exec()];
                    case 1:
                        users = _a.sent();
                        test.ok(users);
                        test.equal(users.length, 2);
                        test.equal(users[0].status, undefined);
                        return [3 /*break*/, 3];
                    case 2:
                        err_10 = _a.sent();
                        test.ifError(err_10);
                        return [3 /*break*/, 3];
                    case 3:
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
        'Filtered Fields': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var users, err_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, user_schema_1.User.find().setAuthLevel(['admin', 'owner']).exec()];
                    case 1:
                        users = _a.sent();
                        test.ok(users);
                        test.equal(users.length, 2);
                        test.equal(users[0].status, 'active');
                        test.equal(users[0].full_name, 'Archer Sterling');
                        return [3 /*break*/, 3];
                    case 2:
                        err_11 = _a.sent();
                        test.ifError(err_11);
                        return [3 /*break*/, 3];
                    case 3:
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
        'Filtered Fields (lean)': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var users, err_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, user_schema_1.User.find()
                                .setAuthLevel(['admin', 'owner'])
                                .lean()
                                .exec()];
                    case 1:
                        users = _a.sent();
                        test.ok(users);
                        test.equal(users.length, 2);
                        test.equal(users[0].status, 'active');
                        return [3 /*break*/, 3];
                    case 2:
                        err_12 = _a.sent();
                        test.ifError(err_12);
                        return [3 /*break*/, 3];
                    case 3:
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
        'findOne': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var user, err_13;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, user_schema_1.User.findOne({ email: 'foo@example.com' })
                                .setAuthLevel('admin')
                                .exec()];
                    case 1:
                        user = _a.sent();
                        test.ok(user);
                        test.equal(user.status, 'active');
                        return [3 /*break*/, 3];
                    case 2:
                        err_13 = _a.sent();
                        test.ifError(err_13);
                        return [3 /*break*/, 3];
                    case 3:
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
        'with permissions option: true': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, user_schema_1.User.findOne()
                            .setOptions({ authLevel: 'admin', permissions: true })
                            .exec()];
                    case 1:
                        user = _a.sent();
                        test.ok(user);
                        test.deepEqual(user.permissions.read.sort(), ['_id', 'email', 'first_name', 'last_name', 'avatar', 'status', 'best_friend'].sort());
                        test.deepEqual(user.permissions.write.sort(), ['status', 'primary_location'].sort());
                        test.strictEqual(user.permissions.remove, false);
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
        'with permissions option: named': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, user_schema_1.User.findOne()
                            .setOptions({ authLevel: 'admin', permissions: 'perms' })
                            .exec()];
                    case 1:
                        user = _a.sent();
                        test.ok(user);
                        test.deepEqual(user.perms.read.sort(), ['_id', 'email', 'first_name', 'last_name', 'avatar', 'status', 'best_friend'].sort());
                        test.deepEqual(user.perms.write.sort(), ['status', 'primary_location'].sort());
                        test.strictEqual(user.perms.remove, false);
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
        'with permissions option (lean)': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, user_schema_1.User.findOne()
                            .setOptions({ authLevel: 'admin', permissions: true })
                            .lean()
                            .exec()];
                    case 1:
                        user = _a.sent();
                        test.ok(user);
                        test.deepEqual(user.permissions.read.sort(), ['_id', 'email', 'first_name', 'last_name', 'avatar', 'status', 'best_friend'].sort());
                        test.deepEqual(user.permissions.write.sort(), ['status', 'primary_location'].sort());
                        test.strictEqual(user.permissions.remove, false);
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
        'nested document, top level': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, user_schema_1.User
                            .findOne({ email: 'bar@example.com' })
                            .setAuthLevel('top_level_nested')
                            .exec()];
                    case 1:
                        user = _a.sent();
                        test.equal(user.nested.foo, 'bar', 'should be able to read entire nested obj with access to top level key');
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
        'nested document, deep level': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, user_schema_1.User
                            .findOne({ email: 'bar@example.com' })
                            .setAuthLevel('deep_nested_access')
                            .exec()];
                    case 1:
                        user = _a.sent();
                        test.equal(user.nested.foo, 'bar', 'should be able to read specific key in nested object');
                        test.equal(user.nested.cant_see, undefined, 'should not be able to read specific sub-object key not in permissions');
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
    },
    'Saving Documents': {
        'no permissions passed': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var err_14;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        test.expect(1);
                        userDocs[0].status = 'disabled';
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, userDocs[0].save()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_14 = _a.sent();
                        test.equals(err_14.name, 'PermissionDenied');
                        return [3 /*break*/, 4];
                    case 4:
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
        'wrong permissions passed': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var err_15;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        test.expect(1);
                        userDocs[0].status = 'disabled';
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, userDocs[0].save({ authLevel: 'owner' })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_15 = _a.sent();
                        test.equals(err_15.name, 'PermissionDenied');
                        return [3 /*break*/, 4];
                    case 4:
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
        'correct permissions passed': function (test) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        test.expect(1);
                        userDocs[0].status = 'disabled';
                        return [4 /*yield*/, userDocs[0].save({ authLevel: 'admin' })];
                    case 1:
                        _a.sent();
                        test.equals(userDocs[0].status, 'disabled');
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
    },
    'Updating Documents': {
        'no permissions passed': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var err_16;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        test.expect(1);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, user_schema_1.User.update({ _id: userDocs[0]._id }, { status: 'disabled' })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_16 = _a.sent();
                        test.equals(err_16.name, 'PermissionDenied');
                        return [3 /*break*/, 4];
                    case 4:
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
        'wrong permissions passed': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var err_17;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        test.expect(1);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, user_schema_1.User.update({ _id: userDocs[0]._id }, { status: 'disabled' }, { authLevel: 'owner' })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_17 = _a.sent();
                        test.equals(err_17.name, 'PermissionDenied');
                        return [3 /*break*/, 4];
                    case 4:
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
        'correct permission passed': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var updateStatus;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, user_schema_1.User.update({ _id: userDocs[0]._id }, { status: 'disabled' }, { authLevel: 'admin' })];
                    case 1:
                        updateStatus = _a.sent();
                        test.ok(updateStatus);
                        test.equals(updateStatus.n, 1);
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
        'findOneAndUpdate': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, user_schema_1.User.findOneAndUpdate({ _id: userDocs[0]._id }, { status: 'disabled' }, { authLevel: 'admin' })];
                    case 1:
                        user = _a.sent();
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
                        return [2 /*return*/];
                }
            });
        }); },
        'findOneAndUpdate with `new` option': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, user_schema_1.User.findOneAndUpdate({ _id: userDocs[0]._id }, { status: 'disabled' }, { new: true, authLevel: 'admin' })];
                    case 1:
                        user = _a.sent();
                        test.equals(user.status, 'disabled');
                        test.done();
                        return [2 /*return*/];
                }
            });
        }); },
    },
    'Sub Schemas': {
        create: {
            'allowed': function (test) { return __awaiter(_this, void 0, void 0, function () {
                var user, err_18;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            user = userDocs[1];
                            user.primary_location = { lat: 2, lon: 2 };
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, user.save({ authLevel: 'admin' })];
                        case 2:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            err_18 = _a.sent();
                            test.ifError(err_18);
                            return [3 /*break*/, 4];
                        case 4:
                            test.done();
                            return [2 /*return*/];
                    }
                });
            }); },
            'not allowed': function (test) { return __awaiter(_this, void 0, void 0, function () {
                var user, err_19;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            test.expect(1);
                            user = userDocs[1];
                            user.primary_location = { lat: 2, lon: 2 };
                            user.markModified('primary_location');
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, user.save({ authLevel: 'owner' })];
                        case 2:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            err_19 = _a.sent();
                            console.log('hna!!');
                            console.log('err', JSON.stringify(err_19, null, 2));
                            test.ok(err_19 instanceof PermissionDeniedError);
                            return [3 /*break*/, 4];
                        case 4:
                            test.done();
                            return [2 /*return*/];
                    }
                });
            }); },
        },
    },
    'Population Propagation': {
        'permissions only at top level': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var users;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, user_schema_1.User
                            .find({ email: 'foo@example.com' })
                            .setAuthLevel('admin')
                            .populate('best_friend')
                            .exec()];
                    case 1:
                        users = _a.sent();
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
                        return [2 /*return*/];
                }
            });
        }); },
        'permissions explicitly passed down': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var users;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, user_schema_1.User
                            .find({ email: 'foo@example.com' })
                            .setAuthLevel('admin')
                            .populate({
                            path: 'best_friend',
                            options: { authLevel: 'admin' },
                        })
                            .exec()];
                    case 1:
                        users = _a.sent();
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
                        return [2 /*return*/];
                }
            });
        }); },
        'permissions explicitly disabled on lower level': function (test) { return __awaiter(_this, void 0, void 0, function () {
            var users;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, user_schema_1.User
                            .find({ email: 'foo@example.com' })
                            .setAuthLevel('admin')
                            .populate({
                            path: 'best_friend',
                            options: { authLevel: false },
                        })
                            .exec()];
                    case 1:
                        users = _a.sent();
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
                        return [2 /*return*/];
                }
            });
        }); },
    },
};
//# sourceMappingURL=index.test.js.map