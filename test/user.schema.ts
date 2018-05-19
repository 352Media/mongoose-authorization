import authorizationPlugin = require('../src/index');
import locationSchema = require('./location.schema');
import {AuthorizationSchema} from '../src/AuthorizationSchema';
import {model, Schema, Model, Document} from 'mongoose';
import {ObjectID} from 'bson';
import {ILocation} from './location.schema';

const userSchema = new AuthorizationSchema({
    email: {
        type: String,
        required: true,
    },
    first_name: {
        type: String,
        required: true,
    },
    last_name: {
        type: String,
        required: true,
    },
    password: String,
    login_attempts: {
        type: Number,
        default: 0,
    },
    avatar: {
        type: String,
    },
    last_login_date: {
        type: Date,
    },
    status: {
        type: String,
        required: true,
        default: 'active',
    },
    best_friend: {
        type: Schema.Types.ObjectId,
        ref: 'newusers',
    },
    nested: {
        foo: String,
        cant_see: String,
    },
    primary_location: locationSchema,
    all_locations: [locationSchema],
    beyond_permissions: {
        type: String,
        default: 'some value',
    },
});

userSchema.virtual('full_name').get(function getFullName() {
    return `${this.first_name} ${this.last_name}`;
});

/*
 * Make sure you add this before compiling your model
 */
userSchema.permissions = {
    defaults: {
        read: ['_id', 'email', 'first_name', 'last_name', 'avatar'],
    },
    admin: {
        read: ['status', 'best_friend'],
        write: ['status', 'primary_location'],
        create: true,
    },
    owner: {
        read: ['last_login_date', 'full_name'],
        write: ['email', 'first_name', 'last_name', 'avatar'],
        remove: true,
    },
    top_level_nested: {
        read: ['nested'],
        write: ['nested'],
    },
    deep_nested_access: {
        read: ['nested.foo'],
    },
};

userSchema.plugin(authorizationPlugin);

export interface IUser extends Document {
    email: string;

    first_name: string;
    last_name: string;

    full_name: string;

    password: string;
    login_attempts: number;
    avatar: string;
    last_login_date: Date;
    status: string;
    best_friend: ObjectID | IUser;
    nested: string;
    primary_location: ILocation;
    all_locations: ILocation;
    beyond_permissions: string;
}

export interface IUserModel extends Model<IUser> {
}

/*
 * Compile model
 */
export const User: IUserModel = model('newusers', userSchema);
