const mongoose = require('mongoose');
const authorizationPlugin = require('../');

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
  beyond_permissions: {
    type: String,
    default: 'some value',
  },
});

userSchema.virtual('full_name').get(function () {
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
    read: ['status'],
    write: ['status'],
    create: true,
  },
  owner: {
    read: ['last_login_date', 'full_name'],
    write: ['email', 'first_name', 'last_name', 'avatar'],
    remove: true,
  },
};

userSchema.plugin(authorizationPlugin);

/*
 * Compile model
 */
const users = mongoose.model('newusers', userSchema);

module.exports = users;
