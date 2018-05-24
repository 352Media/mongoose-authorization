

const mongoose = require('mongoose');
const mongooseAuthorization = require('../');

const carSchema = new mongoose.Schema({
  make: {
    type: String,
    required: true,
    unique: true,
  },
  model: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
  },
  plate: {
    type: String,
  },
});

/*
 * Make sure you add this before compiling your model
 */
carSchema.permissions = {
  maker: {
    write: ['make', 'model', 'year'],
    remove: true,
    create: true,
  },
  dealer: {
    read: ['_id', 'make', 'model', 'year', 'plate'],
    write: ['plate'],
  },
};

carSchema.getAuthLevel = function getAuthLevel(payload, doc) {
  if (payload) {
    if (doc && payload.companyName === doc.make) {
      return 'maker';
    } else if (payload.companyName) {
      return 'dealer';
    }
  }
  return [];
};

carSchema.plugin(mongooseAuthorization);

/*
 * Compile model
 */
const cars = mongoose.model('cars', carSchema);

module.exports = cars;
