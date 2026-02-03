const axios = require('axios');
const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const { updateAppStatus } = require('./applicationService');

const triggerAgent = async (applicationId, jobUrl, resumePath, rules, credentials) => {
  try {
    await updateAppStatus(applicationId, {
      logs: [{ message: 'Extracting resume intelligence from PDF...', timestamp: new Date() }]
    });

    // Parse PDF locally
    const dataBuffer = fs.readFileSync(resumePath);
    let resumeText = '';
    try {
      const parser = new PDFParse({ data: dataBuffer });
      const pdfData = await parser.getText();
      resumeText = pdfData.text;
      console.log('PDF parsed successfully, text length:', resumeText.length);
    } catch (pdfError) {
      console.error('PDF parsing error:', pdfError);
      // Fallback: try to read as plain text
      resumeText = dataBuffer.toString('utf-8');
      console.log('Using fallback text extraction, length:', resumeText.length);
    }

    // Optimize Resume Text (Token Saving)
    // Extract Experience, Education, Skills if possible, otherwise truncate
    let optimizedResume = resumeText;
    
    // Simple extraction logic (case insensitive)
    const keywords = ['Experience', 'Education', 'Skills', 'Work History', 'Qualifications'];
    let foundIndices = [];
    keywords.forEach(kw => {
        const idx = resumeText.toLowerCase().indexOf(kw.toLowerCase());
        if (idx !== -1) foundIndices.push(idx);
    });
    
    if (foundIndices.length > 0) {
        // Find the earliest occurrence of a key section to start extraction
        const startIdx = Math.min(...foundIndices);
        // Take a reasonable chunk from there
        optimizedResume = resumeText.substring(startIdx, startIdx + 8000); // 8k chars limit
        console.log(`Optimized resume: Found keywords, extracted ${optimizedResume.length} chars from index ${startIdx}`);
    } else {
        // Just truncate key parts
        optimizedResume = resumeText.substring(0, 5000);
        console.log(`Optimized resume: No keywords found, truncated to ${optimizedResume.length} chars`);
    }

    await updateAppStatus(applicationId, {
      logs: [{ message: `Resume processed. Length reduced from ${resumeText.length} to ${optimizedResume.length} chars. Sending...`, timestamp: new Date() }]
    });

    // Send to Python FastAPI server
    const response = await axios.post('http://localhost:8012/run-task', {
      url: jobUrl,
      resume_text: optimizedResume,
      rules: rules,
      username: credentials.username,
      password: credentials.password
    });

    const resultText = response.data.result ? String(response.data.result) : "No result provided";
    await updateAppStatus(applicationId, {
      status: response.data.status === 'completed' ? 'applied' : 'failed',
      logs: [{ 
        message: 'Local Agent finished: ' + resultText.substring(0, 100) + '...', 
        timestamp: new Date() 
      }]
    });

  } catch (err) {
    console.error('Local Agent Error:', err.message);
    if (err.response) {
      console.error('Agent Response Data:', JSON.stringify(err.response.data, null, 2));
      console.error('Agent Response Status:', err.response.status);
    }
    await updateAppStatus(applicationId, {
      status: 'failed',
      logs: [{ message: `Local Agent error: ${err.message}`, timestamp: new Date() }]
    });
  }
};

module.exports = { triggerAgent };
