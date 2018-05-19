export declare function resolveAuthLevel(schema: any, options: any, doc?: any): any;
export declare function getAuthorizedFields(schema: any, options: any, action: any, doc?: any): string[];
export declare function hasPermission(schema: any, options: any, action: any, doc?: any): boolean;
export declare function authIsDisabled(options: any): boolean;
export declare function embedPermissions(schema: any, options: any, doc: any): void;
export declare function sanitizeDocument(schema: any, options: any, doc: any): any;
export declare function sanitizeDocumentList(schema: any, options: any, docs: any): any;
export declare function getUpdatePaths(updates: any): any;
