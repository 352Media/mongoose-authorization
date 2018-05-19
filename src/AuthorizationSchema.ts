import {Schema} from 'mongoose';

export class AuthorizationSchema extends Schema {
    public permissions: any;

    public getAuthLevel: (payload: any, doc: any) => string[] | string;
}
