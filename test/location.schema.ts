import {AuthorizationSchema} from '../src/AuthorizationSchema';

export const locationSchema = new AuthorizationSchema({
    lat: Number,
    lon: Number,
});

locationSchema.permissions = {
    admin: {
        read: ['lat', 'lon'],
        write: ['lat', 'lon'],
        create: true,
    },
    owner: {
        read: ['lat', 'lon'],
        remove: true,
    },
    script: {
        create: true,
        write: ['lat', 'lon'],
    },
};

export interface ILocation {
    lat: number;
    lon: number;
}
