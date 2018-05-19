const mongoose = require('mongoose');
const authorizationPlugin = require('../');
const locationSchema = require('./location.schema');

const userSchema = new mongoose.Schema({
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
    type: mongoose.Schema.Types.ObjectId,
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

/*
 * Compile model
 */
const users = mongoose.model('newusers', userSchema);

module.exports = users;
