"use strict";
var _ = require("lodash");
var helpers_1 = require("./helpers");
var PermissionDeniedError = require("./PermissionDeniedError");
module.exports = function (schema) {
    function save(doc, options, next) {
        if (doc.isNew && !helpers_1.hasPermission(schema, options, 'create', doc)) {
            return next(new PermissionDeniedError('create'));
        }
        var authorizedFields = helpers_1.getAuthorizedFields(schema, options, 'write', doc);
        var modifiedPaths = doc.modifiedPaths();
        var discrepancies = _.difference(modifiedPaths, authorizedFields);
        if (discrepancies.length > 0) {
            return next(new PermissionDeniedError('write', discrepancies));
        }
        return next();
    }
    function removeQuery(query, next) {
        if (!helpers_1.hasPermission(schema, query.options, 'remove')) {
            return next(new PermissionDeniedError('remove'));
        }
        return next();
    }
    function removeDoc(doc, options, next) {
        if (!helpers_1.hasPermission(schema, options, 'remove', doc)) {
            return next(new PermissionDeniedError('remove'));
        }
        return next();
    }
    function find(query, docs, next) {
        var sanitizedResult = helpers_1.sanitizeDocumentList(schema, query.options, docs);
        return next(null, sanitizedResult);
    }
    function update(query, next) {
        // If this is an upsert, you'll need the create permission
        // TODO add some tests for the upset case
        if (query.options
            && query.options.upsert
            && !helpers_1.hasPermission(schema, query.options, 'create')) {
            return next(new PermissionDeniedError('create'));
        }
        var authorizedFields = helpers_1.getAuthorizedFields(schema, query.options, 'write');
        // check to see if the group is trying to update a field it does not have permission to
        var modifiedPaths = helpers_1.getUpdatePaths(query._update);
        var discrepancies = _.difference(modifiedPaths, authorizedFields);
        if (discrepancies.length > 0) {
            return next(new PermissionDeniedError('write', discrepancies));
        }
        // TODO handle the overwrite option
        // TODO handle Model.updateMany
        // Detect which fields can be returned if 'new: true' is set
        var authorizedReturnFields = helpers_1.getAuthorizedFields(schema, query.options, 'read');
        // create a sanitizedReturnFields object that will be used to return only the fields that a
        // group has access to read
        var sanitizedReturnFields = {};
        authorizedReturnFields.forEach(function (field) {
            if (!query._fields || query._fields[field]) {
                sanitizedReturnFields[field] = 1;
            }
        });
        query._fields = sanitizedReturnFields;
        return next();
    }
    // Find paths with permissioned schemas and store those so deep checks can be done
    // on the right paths at call time.
    schema.pathsWithPermissionedSchemas = {};
    schema.eachPath(function (path, schemaType) {
        var subSchema = schemaType.schema;
        if (subSchema && subSchema.permissions) {
            schema.pathsWithPermissionedSchemas[path] = subSchema;
        }
    });
    schema.pre('findOneAndRemove', function preFindOneAndRemove(next) {
        if (helpers_1.authIsDisabled(this.options)) {
            return next();
        }
        return removeQuery(this, next);
    });
    // TODO, WTF, how to prevent someone from Model.find().remove().exec(); That doesn't
    // fire any remove hooks. Does it fire a find hook?
    schema.pre('remove', function preRemove(next, options) {
        if (helpers_1.authIsDisabled(options)) {
            return next();
        }
        return removeDoc(this, options, next);
    });
    schema.pre('save', function preSave(next, options) {
        if (helpers_1.authIsDisabled(options)) {
            return next();
        }
        return save(this, options, next);
    });
    schema.post('find', function postFind(doc, next) {
        if (helpers_1.authIsDisabled(this.options)) {
            return next();
        }
        return find(this, doc, next);
    });
    schema.post('findOne', function postFindOne(doc, next) {
        if (helpers_1.authIsDisabled(this.options)) {
            return next();
        }
        return find(this, doc, next);
    });
    schema.pre('update', function preUpdate(next) {
        if (helpers_1.authIsDisabled(this.options)) {
            return next();
        }
        return update(this, next);
    });
    schema.pre('findOneAndUpdate', function preFindOneAndUpdate(next) {
        if (helpers_1.authIsDisabled(this.options)) {
            return next();
        }
        return update(this, next);
    });
    schema.query.setAuthLevel = function setAuthLevel(authLevel) {
        this.options.authLevel = authLevel;
        return this;
    };
    schema.statics.canCreate = function canCreate(options) {
        return helpers_1.hasPermission(this.schema, options, 'create');
    };
};
//# sourceMappingURL=index.js.map