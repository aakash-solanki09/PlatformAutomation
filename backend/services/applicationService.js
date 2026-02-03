const Application = require('../models/Application');
const mongoose = require('mongoose');

// In-Memory Fallback Storage
const memoryDB = new Map();

const updateAppStatus = async (id, update) => {
  const isDBConnected = mongoose.connection.readyState === 1;
  const idStr = String(id);

  if (isDBConnected && !idStr.startsWith('mem_')) {
    try {
      const app = await Application.findById(id);
      if (app) {
        if (update.logs) app.logs.push(...update.logs);
        if (update.status) app.status = update.status;
        if (update.taskId) app.taskId = update.taskId;
        if (update.resumeUrl) app.resumeUrl = update.resumeUrl;
        await app.save();
      }
    } catch (err) {
      console.error('Error updating DB status:', err.message);
    }
  } else {
    const app = memoryDB.get(idStr);
    if (app) {
      if (update.logs) app.logs.push(...update.logs);
      if (update.status) app.status = update.status;
      if (update.taskId) app.taskId = update.taskId;
      if (update.resumeUrl) app.resumeUrl = update.resumeUrl;
    }
  }
};

const getAppById = async (id) => {
  const isDBConnected = mongoose.connection.readyState === 1;
  const idStr = String(id);
  
  if (isDBConnected && !idStr.startsWith('mem_')) {
    return await Application.findById(id);
  } else {
    return memoryDB.get(idStr);
  }
};

const saveToMemory = (id, data) => {
  memoryDB.set(String(id), data);
};

module.exports = { updateAppStatus, getAppById, saveToMemory };
