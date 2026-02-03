const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const applicationRoutes = require('./routes/applications');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

app.use('/api', applicationRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log(`
✅ MONGODB ATLAS CONNECTED
──────────────────────────────────────────
🚀 SERVER LIVE: http://localhost:${PORT}
📂 UPLOADS: ${uploadDir}
🛠️ MODE: Enterprise (Persistent DB)
    `);
  })
  .catch(err => {
    console.warn('\n⚠️ MONGODB CONNECTION FAILED');
    console.error('Error:', err.message);
    console.log(`
🚀 SERVER LIVE: http://localhost:${PORT}
📂 UPLOADS: ${uploadDir}
🛠️ MODE: Hyper-Lite (Session-Only)
    `);
  });

app.listen(PORT);
