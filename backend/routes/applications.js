const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const Application = require('../models/Application');
const { triggerAgent } = require('../services/localAgentService');
const { updateAppStatus, getAppById, saveToMemory } = require('../services/applicationService');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.post('/apply', upload.single('resume'), async (req, res) => {
  const { jobUrl, rules, username, password } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ error: 'Resume file is required' });
  }

  const isDBConnected = mongoose.connection.readyState === 1;

  try {
    const appData = {
      jobUrl,
      resumePath: req.file.path,
      rules,
      credentials: { username, password },
      status: 'processing',
      logs: [{ message: 'Mission control: File upload verified. Initializing agent...' }],
      createdAt: new Date()
    };

    let applicationId;

    if (isDBConnected) {
      const application = new Application(appData);
      await application.save();
      applicationId = application._id;
    } else {
      applicationId = 'mem_' + Date.now();
      appData._id = applicationId;
      saveToMemory(applicationId, appData);
    }

    // Trigger local Python agent
    triggerAgent(applicationId, jobUrl, req.file.path, rules, { username, password });

    res.status(202).json({
      message: 'Agent deployment initiated locally',
      applicationId: applicationId
    });
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/status/:id', async (req, res) => {
  try {
    const application = await getAppById(req.params.id);
    if (!application) return res.status(404).json({ error: 'Application not found' });
    res.json(application);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
