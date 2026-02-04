const express = require('express');
const router = express.Router();
const PlatformCredential = require('../models/PlatformCredential');
const auth = require('../middleware/auth');

// Get all saved credentials for the current user
router.get('/', auth, async (req, res) => {
  try {
    const credentials = await PlatformCredential.find({ userId: req.user.id });
    res.json(credentials);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save or update credentials for a platform
router.post('/', auth, async (req, res) => {
  try {
    const { platformName, loginUrl, username, password } = req.body;
    
    const credential = await PlatformCredential.findOneAndUpdate(
      { userId: req.user.id, platformName },
      { loginUrl, username, password },
      { upsert: true, new: true }
    );
    
    res.json(credential);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete credentials for a platform
router.delete('/:id', auth, async (req, res) => {
  try {
    await PlatformCredential.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: 'Credential removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
