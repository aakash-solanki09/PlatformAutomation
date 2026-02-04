const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { updateAppStatus } = require('./applicationService');
const SubmissionRecord = require('../models/SubmissionRecord');
const Application = require('../models/Application');

const triggerAgent = async (applicationId, platformNameOverride) => {
  try {
    const application = await Application.findById(applicationId);
    if (!application) throw new Error('Application not found');

    const { jobUrl, resumePath, rules, credentials, userId, loginUrl } = application;
    const platformName = platformNameOverride || 'LinkedIn';

    await updateAppStatus(applicationId, {
      logs: [{ message: 'Extracting resume intelligence from PDF...', timestamp: new Date() }]
    });

    let resumeText = '';
    const absolutePathForAgent = path.resolve(resumePath);
    console.log(`🔍 [Backend Diagnostic] Target Path: ${absolutePathForAgent}`);
    
    if (resumePath && fs.existsSync(absolutePathForAgent)) {
      try {
        const pdfLib = require('pdf-parse');
        let pdfData;

        // Versatile loader to handle different pdf-parse variants and export styles
        if (typeof pdfLib === 'function') {
          const dataBuffer = fs.readFileSync(absolutePathForAgent);
          pdfData = await pdfLib(dataBuffer);
        } else if (pdfLib.PDFParse && typeof pdfLib.PDFParse === 'function') {
          const dataBuffer = fs.readFileSync(absolutePathForAgent);
          // Check if it needs 'new' or just a call
          try {
            const parser = new pdfLib.PDFParse({ data: dataBuffer });
            pdfData = await parser.getText();
          } catch (e) {
            pdfData = await pdfLib.PDFParse(dataBuffer);
          }
        } else if (pdfLib.default && typeof pdfLib.default === 'function') {
          const dataBuffer = fs.readFileSync(absolutePathForAgent);
          pdfData = await pdfLib.default(dataBuffer);
        } else {
          throw new Error('Could not find a valid PDF parsing function in the library');
        }
        
        resumeText = pdfData?.text || 'No text extracted from PDF.';
        console.log(`✅ [Backend Diagnostic] PDF parsed: ${resumeText.length} characters`);
      } catch (pdfError) {
        console.error('❌ [Backend Diagnostic] PDF parsing error:', pdfError.message);
        resumeText = 'Failed to extract text from PDF.';
      }
    } else {
      console.warn(`⚠️ [Backend Diagnostic] File NOT found at: ${absolutePathForAgent}`);
    }
    let optimizedResume = resumeText.substring(0, 8000);

    await updateAppStatus(applicationId, {
      logs: [{ message: `Resume processed (${optimizedResume.length} chars). Sending to local agent...`, timestamp: new Date() }]
    });

    const response = await axios.post('http://localhost:8012/run-task', {
      url: jobUrl,
      resume_text: optimizedResume,
      resume_path: absolutePathForAgent, // Added absolute path for file uploads
      rules: rules,
      username: credentials?.username || '',
      password: credentials?.password || '',
      platform_name: platformName,
      login_url: loginUrl || ''
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
