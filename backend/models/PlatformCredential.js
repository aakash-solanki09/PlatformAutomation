const mongoose = require('mongoose');

const PlatformCredentialSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platformName: { type: String, required: true },
  loginUrl: { type: String },
  username: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Ensure a user can only have one set of credentials per platform name
PlatformCredentialSchema.index({ userId: 1, platformName: 1 }, { unique: true });

module.exports = mongoose.model('PlatformCredential', PlatformCredentialSchema);
