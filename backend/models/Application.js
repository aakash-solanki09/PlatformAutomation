const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  jobUrl: { type: String, required: true },
  resumePath: { type: String, required: true }, // Local path to the uploaded file
  resumeUrl: { type: String }, // Public URL (ngrok etc)
  rules: { type: String },
  credentials: {
    username: { type: String },
    password: { type: String }
  },
  status: { type: String, default: 'pending' }, 
  logs: [{
    timestamp: { type: Date, default: Date.now },
    message: { type: String }
  }],
  taskId: { type: String }, 
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Application', ApplicationSchema);
