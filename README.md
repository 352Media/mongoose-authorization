# mongoose-authorization

[![Build Status](https://travis-ci.org/xChrisPx/mongoose-authorization.svg?branch=dev)](https://travis-ci.org/xChrisPx/mongoose-authorization)

This plugin allows you to define a custom authorization scheme on your mongoose models.

`npm install -S mongoose-authorization`


## Getting Started

First you need to add your permissions to your schema.

#### example model

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

/*
 * Make sure you add this before compiling your model
 */
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

/*
 * Compile model
 */
var users = mongoose.model('users', userSchema);

module.exports = users;
```

In the example above we extended the **userSchema** by adding a *permissions* object. This will not persist to your documents.

The permissions object consists or properties that represent your authorization levels (or groups). For each group, there are 4 permissions you can configure.
* `save` (create) - Boolean
* `remove` - Boolean
* `write` - [array of fields] *NOTE: if `upsert: true`, the group will need to have `save` permissions too*
* `read` (find) - [array of fields]

You can also specify a `defaults` group, which represents permissions that are available to all groups.

#### Example Uses

###### *NOTE: If you do not add the authLevel option to your request, the plugin will not attempt to authorize it. This makes it possible for you to handle requests that may not be initiated by a user (eg. system call, batch job, etc.)*

***example update***

You can also specify an array of authentication levels. This would merge the settings of each auth level.

```javascript
users.update({user_id: userUpdate.user_id}, userUpdate, {
  authLevel: 'admin'
}, function(err, doc) {
  if (err) {
    //handle error
  } else {
    //success
  }
});
```

***example findOneAndUpdate using the newer promise syntax***

###### *NOTE: the return document will be sanitized based on the group's permissions for `read`*

```javascript
users.findOneAndUpdate({user_id: userUpdate.user_id}, userUpdate)
.exec()
.then(function(doc) {
    //success
})
.catch(function(err) {
    // handle error
})
```


***example find***

```javascript
users.find({user_id: userUpdate.user_id}, null, {
  authLevel: 'admin'
}, function(err, doc) {
  if (err) {
    //handle error
  } else {
    //success
  }
});
```

***example findOne***

```javascript
users.findOne({user_id: userUpdate.user_id}, null, {
  authLevel: 'admin'
}, function(err, doc) {
  if (err) {
    //handle error
  } else {
    //success
  }
});
```

***example findOneAndRemove***

###### *NOTE: doc.remove is not supported yet*

```javascript
users.findOneAndRemove({user_id: userUpdate.user_id}, {
  authLevel: 'admin'
}, function(err) {
  if (err) {
    //handle error
  } else {
    //success
  }
});
```
