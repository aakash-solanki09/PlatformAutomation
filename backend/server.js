const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const applicationRoutes = require('./routes/applications');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const platformCredentialsRoutes = require('./routes/platformCredentials');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5011;
const uploadDir = path.join(__dirname, 'uploads');
const resumesDir = path.join(uploadDir, 'resumes');

// Ensure upload directories exist
[uploadDir, resumesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// Route Registration
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/platforms', platformCredentialsRoutes);
app.use('/api', applicationRoutes); // Mount this last as it's the most generic


// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log(`
✅ MONGODB ATLAS CONNECTED
──────────────────────────────────────────
🚀 SERVER LIVE: http://localhost:${PORT}
    `);
  })
  .catch(err => {
    console.warn('\n⚠️ MONGODB CONNECTION FAILED');
    console.error('Error:', err.message);
  });

app.listen(PORT);
 village:32
