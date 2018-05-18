const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
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

module.exports = locationSchema;
