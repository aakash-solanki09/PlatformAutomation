const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const UserData = require('../models/UserData');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/resumes';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

const auth = require('../middleware/auth');

// Get User Profile
router.get('/profile', auth, async (req, res) => {
  try {
    let data = await UserData.findOne({ userId: req.user.id });
    if (!data) {
      data = new UserData({ userId: req.user.id });
      await data.save();
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update User Profile
router.post('/profile', auth, upload.single('resume'), async (req, res) => {
  try {
    const updates = JSON.parse(req.body.data || '{}');
    let data = await UserData.findOne({ userId: req.user.id });
    
    if (!data) {
      data = new UserData({ userId: req.user.id });
    }

    if (req.file) {
      data.resumePath = req.file.path.replace(/\\/g, '/');
      data.resumeUrl = `${process.env.RESUME_BASE_URL || 'http://localhost:5011'}/${data.resumePath}`;
    }

    if (updates.bio) data.bio = updates.bio;
    if (updates.preferences) {
      data.preferences = { ...data.preferences.toObject(), ...updates.preferences };
    }

    await data.save();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process Profile with AI
const { processUserData } = require('../services/aiService');
router.post('/process', auth, async (req, res) => {
  try {
    const data = await UserData.findOne({ userId: req.user.id });
    if (!data) return res.status(404).json({ error: 'Profile not found' });

    const processed = await processUserData(data, data.resumePath);
    if (!processed) return res.status(500).json({ error: 'AI processing failed' });

    data.aiProcessedData = processed;
    await data.save();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
