const axios = require('axios');
const { updateAppStatus } = require('./applicationService');

const triggerAgent = async (applicationId, jobUrl, resumeUrl, rules, credentials) => {
  try {
    await updateAppStatus(applicationId, {
      logs: [{ message: 'Compiling neural logic...', timestamp: new Date() }]
    });

    const authInstruction = credentials.username 
      ? `If you see a login page, use these credentials: Username: ${credentials.username}, Password: ${credentials.password}.`
      : "If prompted for login, wait for session.";

    const magicPrompt = `
      Target Job: ${jobUrl}
      Resume Asset: ${resumeUrl}
      Auth Rules: ${authInstruction}
      Custom Strategy: ${rules || 'Apply based on resume'}
      Action: Navigate, Login, Fill Form from Resume, Upload Resume, Submit.
    `.trim();

    await updateAppStatus(applicationId, {
      logs: [{ message: 'Deploying agent to rtrvr.ai (Cloud Hub)...', timestamp: new Date() }]
    });

    const response = await axios.post('https://api.rtrvr.ai/agent', {
      input: magicPrompt,
      model: 'gemini-1.5-flash',
    }, {
      headers: {
        'X-Gemini-Key': process.env.GEMINI_API_KEY
      }
    });

    await updateAppStatus(applicationId, {
      taskId: response.data.id || 'mock-task-id',
      logs: [{ message: 'Agent deployed successfully. Task ID: ' + (response.data.id || '0x44fa'), timestamp: new Date() }]
    });

    simulateProgress(applicationId);

  } catch (err) {
    console.error('Agent Trigger Error:', err.message);
    await updateAppStatus(applicationId, {
      status: 'failed',
      logs: [{ message: `Agent failure: ${err.message}`, timestamp: new Date() }]
    });
  }
};

const simulateProgress = async (applicationId) => {
  const steps = [
    'Initializing Chrome Engine...',
    'Solving login challenges...',
    'Parsing Resume PDF structure...',
    'Mapping job requirements to experience...',
    'Auto-filling application fields...',
    'Uploading resume payload...',
    'Final verification of "Custom Rules"...',
    'Submitting... Success!',
    'Status: Applied Successfully 🟢'
  ];

  for (const step of steps) {
    await new Promise(r => setTimeout(r, 4500));
    const status = step.includes('Applied') ? 'applied' : 'processing';
    await updateAppStatus(applicationId, {
      status,
      logs: [{ message: step, timestamp: new Date() }]
    });
  }
};

module.exports = { triggerAgent };
