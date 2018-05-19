"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var AuthorizationSchema_1 = require("../src/AuthorizationSchema");
exports.locationSchema = new AuthorizationSchema_1.AuthorizationSchema({
    lat: Number,
    lon: Number,
});
exports.locationSchema.permissions = {
    admin: {
        read: ['lat', 'lon'],
        write: ['lat', 'lon'],
        create: true,
    },
    owner: {
        read: ['lat', 'lon'],
        remove: true,
    },
    script: {
        create: true,
        write: ['lat', 'lon'],
    },
};
//# sourceMappingURL=location.schema.js.map