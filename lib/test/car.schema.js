"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var AuthorizationSchema_1 = require("../src/AuthorizationSchema");
// tslint:disable-next-line
var mongooseAuthorization = require('../src/index');
var carSchema = new AuthorizationSchema_1.AuthorizationSchema({
    make: {
        type: String,
        required: true,
        unique: true,
    },
    model: {
        type: String,
        required: true,
    },
    year: {
        type: Number,
    },
    plate: {
        type: String,
    },
});
/*
 * Make sure you add this before compiling your model
 */
carSchema.permissions = {
    defaults: {
        read: ['_id', 'make', 'model', 'year'],
    },
    maker: {
        write: ['make', 'model', 'year'],
        remove: true,
        create: true,
    },
    dealer: {
        read: ['_id', 'make', 'model', 'year', 'plate'],
        write: ['plate'],
    },
};
carSchema.getAuthLevel = function getAuthLevel(payload, doc) {
    if (payload) {
        if (doc && payload.companyName === doc.make) {
            return 'maker';
        }
        else if (payload.companyName) {
            return 'dealer';
        }
    }
    return [];
};
carSchema.plugin(mongooseAuthorization);
/*
 * Compile model
 */
var cars = mongoose_1.model('cars', carSchema);
module.exports = cars;
//# sourceMappingURL=car.schema.js.map