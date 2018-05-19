"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
module.exports = /** @class */ (function (_super) {
    __extends(PermissionDeniedError, _super);
    function PermissionDeniedError(action, fields) {
        var _this = this;
        var message = "you don't have the following permission: [" + action + "]";
        if (fields && fields.length) {
            message += " on these fields: [" + fields.toString() + "]";
        }
        _this = _super.call(this, message) || this;
        _this.name = 'PermissionDenied';
        // Set the prototype explicitly.
        Object.setPrototypeOf(_this, PermissionDeniedError.prototype);
        return _this;
    }
    return PermissionDeniedError;
}(Error));
//# sourceMappingURL=PermissionDeniedError.js.map