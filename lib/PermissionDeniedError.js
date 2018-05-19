module.exports = class PermissionDeniedError extends Error {
  constructor(action, fields) {
    let message = `you don't have the following permission: [${action}]`;
    if (fields && fields.length) {
      message += ` on these fields: [${fields.toString()}]`;
    }

    super(message);
    this.name = 'PermissionDenied';
  }
};
