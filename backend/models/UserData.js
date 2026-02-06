const mongoose = require('mongoose');

const UserDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bio: { type: String },
  resumePath: { type: String },
  resumeUrl: { type: String },
  preferences: {
    expectedCtc: { type: String },
    location: { type: String },
    noticePeriod: { type: String },
    remoteOnly: { type: Boolean, default: false },
    visaStatus: { type: String },
    chromeProfilePath: { type: String }
  },
  aiProcessedData: {
    type: Object,
    default: {}
  },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserData', UserDataSchema);
