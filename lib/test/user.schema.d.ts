/// <reference types="mongoose" />
import { Model, Document } from 'mongoose';
import { ObjectID } from 'bson';
import { ILocation } from './location.schema';
export interface IUser extends Document {
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    password: string;
    login_attempts: number;
    avatar: string;
    last_login_date: Date;
    status: string;
    best_friend: ObjectID | IUser;
    nested: string;
    primary_location: ILocation;
    all_locations: ILocation;
    beyond_permissions: string;
}
export interface IUserModel extends Model<IUser> {
}
export declare const User: IUserModel;
