const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const UserData = require('../models/UserData'); // Added to fetch user data
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { triggerAgent: runAutomation } = require('../services/localAgentService');

const uploadDir = path.join(__dirname, '../uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

const auth = require('../middleware/auth');

// Apply for a job
router.post('/apply', auth, upload.single('resume'), async (req, res) => {
  try {
    const { jobUrl, rules, username, password, platformName } = req.body;
    let resumePath = req.file ? req.file.path : null;

    // If no resume uploaded, try to get from user profile
    if (!resumePath) {
      const userData = await UserData.findOne({ userId: req.user.id });
      if (userData && userData.resumePath) {
        resumePath = userData.resumePath;
      }
    }

    if (!resumePath) {
      return res.status(400).json({ error: 'Resume is required. Please upload one or fill your profile.' });
    }

    const application = new Application({
      jobUrl,
      resumePath: resumePath.replace(/\\/g, '/'),
      rules,
      credentials: { username, password },
      status: 'processing',
      userId: req.user.id
    });

    await application.save();

    // Start automation in background
    runAutomation(application._id, platformName).catch(err => {
      console.error('Automation background error:', err);
    });

    res.json({ applicationId: application._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get status and logs
router.get('/status/:id', async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'Not found' });
    res.json({ status: app.status, logs: app.logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
