const axios = require('axios');
const fs = require('fs');
const { updateAppStatus } = require('./applicationService');
const SubmissionRecord = require('../models/SubmissionRecord');
const Application = require('../models/Application');

const triggerAgent = async (applicationId, platformNameOverride) => {
  try {
    const application = await Application.findById(applicationId);
    if (!application) throw new Error('Application not found');

    const { jobUrl, resumePath, rules, credentials, userId } = application;
    const platformName = platformNameOverride || 'LinkedIn';

    await updateAppStatus(applicationId, {
      logs: [{ message: 'Extracting resume intelligence from PDF...', timestamp: new Date() }]
    });

    let resumeText = '';
    if (resumePath && fs.existsSync(resumePath)) {
      try {
        const { PDFParse } = require('pdf-parse');
        const dataBuffer = fs.readFileSync(resumePath);
        const parser = new PDFParse({ data: dataBuffer });
        const pdfData = await parser.getText();
        resumeText = pdfData.text;
      } catch (pdfError) {
        console.error('PDF parsing error in localAgentService:', pdfError);
        resumeText = 'Failed to extract text from PDF.';
      }
    }

    let optimizedResume = resumeText.substring(0, 8000);

    await updateAppStatus(applicationId, {
      logs: [{ message: `Resume processed (${optimizedResume.length} chars). Sending to local agent...`, timestamp: new Date() }]
    });

    const response = await axios.post('http://localhost:8012/run-task', {
      url: jobUrl,
      resume_text: optimizedResume,
      rules: rules,
      username: credentials?.username || '',
      password: credentials?.password || '',
      platform_name: platformName
    });

    const isSuccess = response.data.status === 'completed';
    const resultText = response.data.result ? String(response.data.result) : "No result";

    await updateAppStatus(applicationId, {
      status: isSuccess ? 'applied' : 'failed',
      logs: [{ 
        message: `Agent finished: ${isSuccess ? 'SUCCESS' : 'FAILED'} - ${resultText.substring(0, 50)}...`, 
        timestamp: new Date() 
      }]
    });

    if (isSuccess) {
      const record = new SubmissionRecord({
        userId,
        applicationId,
        jobUrl,
        platform: platformName,
        status: 'OK'
      });
      await record.save();
    }

  } catch (err) {
    console.error('Local Agent Error:', err.message);
    await updateAppStatus(applicationId, {
      status: 'failed',
      logs: [{ message: `Local Agent error: ${err.message}`, timestamp: new Date() }]
    });
  }
};

module.exports = { triggerAgent };
