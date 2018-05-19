# mongoose-authorization

[![Build Status](https://travis-ci.org/352Media/mongoose-authorization.svg?branch=dev)](https://travis-ci.org/352Media/mongoose-authorization)

This plugin allows you to define a custom authorization scheme on your mongoose models.

`npm install --save mongoose-authorization`


## Getting Started

```javascript
'use strict';
var mongoose = require('mongoose');
var authz = require('mongoose-authorization');

var userSchema = new mongoose.Schema({
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
    read: [email', 'first_name', 'last_name', 'avatar']
  },
  admin: {
    read: ['status'],
    write: ['status'],
    create: true
  },
  owner: {
    read: ['status'],
    write: ['email', 'first_name', 'last_name', 'avatar'],
    remove: true
  }
};

userSchema.plugin(authz);

module.exports = mongoose.model('users', userSchema);
```

In the example above we extended the **userSchema** by adding a *permissions* object. This will not persist to your documents.

The permissions object consists of properties that represent your authorization levels (or groups). For each group, there are 4 permissions you can configure.
* `create` - Boolean
* `remove` - Boolean
* `write` - [array of fields] *NOTE: if `upsert: true`, the group will need to have `create` permissions too*
* `read` - [array of fields]

You can also specify a `defaults` group, which represents permissions that are available to all groups.

If you need the document in order to determine the correct authorization level for an action, you can place a static `getAuthLevel` function directly in your schema. For applicable actions, this function will be called with a specific document and a payload of data specified in the query. This is useful when the authorization level depends on matching properties of a user with properties of a specific document to determine if *that* user can modify *that* document.

###### *NOTE: The `getAuthLevel` approach does not work for update or remove queries since the document is not loaded into memory.*

```javascript
var mongoose = require('mongoose');

var carSchema = new mongoose.Schema({
    make: {
        type: String,
        required: true,
        unique: true
      },
    model: {
        type: String,
        required: true
      },
    year: {
        type: Number
      },
    plate: {
        type: String
      }
  });

/*
 * Make sure you add this before compiling your model
 */
carSchema.permissions = {
    defaults: {
        read: ['_id', 'make', 'model', 'year']
      },
    maker: {
        write: ['make', 'model', 'year'],
        remove: true
      },
    dealer: {
        read: ['plate'],
        write: ['plate']
      }
  };

carSchema.getAuthLevel = function (payload, doc) {
    if (payload && doc && payload.companyName === doc.make) {
        return 'maker';
    }

    return 'dealer';
}
```

In you application code, you could then do the following:

```javascript
Car.find({}, null, { authPayload: { companyName: 'Toyota' } }).exec(...);

// or

myCar.save({ authPayload: { companyName: 'Honda' } });
```

You can also have the permissions for a specific document injected into the document when returned from a find query using the `permissions` option on the query. The permissions will be inserted into the object using the key `permissions` unless you specify the desired key name as the permissions option.

```javascript
const user = await User.find().setOptions({ authLevel: 'admin': permissions: true }).exec();

console.log(user.permissions);
// Outputs:
// {
//   read: [...],
//   write: [...],
//   remove: [boolean]
// }

// OR
const user = await User.find().setOptions({ authLevel: 'admin': permissions: 'foo' }).exec();

console.log(user.foo);
// Outputs:
// {
//   read: [...],
//   write: [...],
//   remove: [boolean]
// }
```

#### Example Uses

###### NOTE: If no authLevel is able to be determined, permission to perform the action will be denied. If you would like to circumvent authorization, pass `false` as the authLevel (e.g. `myModel.find().setAuhtLevel(false).exec();`, which will disable authorization for that specific query).

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


###### *NOTE: When using `findOneAndUpdate`, the return document will be sanitized based on the group's permissions for `read`*

```javascript
await users.findOneAndUpdate(
  { user_id: userUpdate.user_id },
  userUpdate,
  { authLevel: 'admin'}
);
```


***example find***

```javascript
await users.find(
  { user_id: userUpdate.user_id },
  null,
  { authLevel: 'admin' }
);
```
