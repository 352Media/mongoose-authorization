'use strict';

var mongoose = require('mongoose');
var uuid = require('uuid');

var userSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        unique: true,
        default: uuid.v4()
      },
    email: {
        type: String,
        required: true,
        unique: true
      },
    first_name: {
        type: String,
        required: true
      },
    last_name: {
        type: String,
        required: true
      },
    password: String,
    login_attempts: {
        type: Number,
        default: 0
      },
    avatar: {
        type: String
      },
    last_login_date: {
        type: Date
      },
    status: {
        type: String,
        required: true,
        default: 'active'
      }
  });

/*
 * Make sure you add this before compiling your model
 */
userSchema.permissions = {
    defaults: {
        read: ['_id', 'user_id', 'email', 'first_name', 'last_name', 'avatar']
      },
    admin: {
        read: ['status'],
        write: ['status'],
        save: true
      },
    owner: {
        read: ['last_login_date'],
        write: ['email', 'first_name', 'last_name', 'avatar'],
        remove: true
      }
  };

userSchema.plugin(require('../'));

/*
 * Compile model
 */
var users = mongoose.model('users', userSchema);

module.exports = users;
