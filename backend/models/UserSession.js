const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  sessionData: {
    type: Object, // This will store the storageState JSON
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('UserSession', userSessionSchema);
