/// <reference types="mongoose" />
import { Schema } from 'mongoose';
export declare class AuthorizationSchema extends Schema {
    permissions: any;
    getAuthLevel: (payload: any, doc: any) => string[] | string;
}
