const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  token: String,
  createdAt: Date,
  expires: {
    type: Date,
    required: true,
    expires: 0 // expire at exactly this date
  },
});

module.exports = mongoose.model('PlunkSession', schema);
