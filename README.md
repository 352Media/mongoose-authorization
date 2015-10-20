# mongoose-authorization
This plugin allows you to define a custom authorization scheme on your mongoose models.

`npm install -S mongoose-authorization`


## How to use

First you need to add your permissions to your schema.

**example model**

###### *NOTE: It is important you do this before compiling your model*

```
'use strict';
var mongoose = require('mongoose');
var uuid = require('uuid');

var userSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    unique : true,
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

userSchema.permissions = {
  defaults: {
    read: ['user_id', 'email', 'first_name', 'last_name', 'avatar']
  },
  admin: {
    read: ['status'],
    write: ['status'],
    save: true
  },
  owner: {
    read: ['status'],
    write: ['email', 'first_name', 'last_name', 'avatar'],
    remove: true
  }
};

userSchema.plugin(require('mongoose-authorization'));

var users = mongoose.model('users', userSchema);

module.exports = users;
```

***example update***

###### *NOTE: If you do not add the authLevel option to your request, the plugin will not attempt to authorize it. This makes it possible for you to handle requests that may not be initiated by a user (eg. system call, batch job, etc.)*

```
users.findOneAndUpdate({user_id: userUpdate.user_id}, userUpdate, {
  authLevel: 'admin'
}, function(err, doc) {
  if (err) {
    //handle error
  } else {
    //success
  }
});
```
