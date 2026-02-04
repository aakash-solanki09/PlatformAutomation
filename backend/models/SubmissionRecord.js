const mongoose = require('mongoose');

const SubmissionRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  jobUrl: { type: String, required: true },
  platform: { type: String, required: true },
  status: { type: String, enum: ['OK', 'FAILED'], required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SubmissionRecord', SubmissionRecordSchema);
