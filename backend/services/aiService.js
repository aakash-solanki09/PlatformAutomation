const axios = require('axios');
const fs = require('fs');

async function processUserData(userData, resumePath) {
  let resumeText = '';
  if (resumePath && fs.existsSync(resumePath)) {
    try {
      const { PDFParse } = require('pdf-parse');
      const dataBuffer = fs.readFileSync(resumePath);
      const parser = new PDFParse({ data: dataBuffer });
      const pdfData = await parser.getText();
      resumeText = pdfData.text;
    } catch (pdfError) {
      console.error('PDF parsing error in aiService:', pdfError);
      resumeText = '';
    }
  }

  const prompt = `
    You are an expert recruitment assistant. Convert the following user information and resume text into a structured JSON format for an automated job application bot.
    
    User Preferences:
    - Expected CTC: ${userData.preferences?.expectedCtc || 'Not specified'}
    - Location: ${userData.preferences?.location || 'Not specified'}
    - Notice Period: ${userData.preferences?.noticePeriod || 'Not specified'}
    - Remote Only: ${userData.preferences?.remoteOnly ? 'Yes' : 'No'}
    - Bio: ${userData.bio || 'Not specified'}

    Resume Content:
    ${resumeText}

    Output valid JSON with the following structure:
    {
      "full_name": "",
      "email": "",
      "phone": "",
      "current_role": "",
      "skills": [],
      "total_experience_years": 0,
      "expected_salary": "",
      "notice_period": "",
      "preferred_location": "",
      "work_mode": "remote/onsite/hybrid",
      "summary": "Short bio for forms",
      "visa_status": "inferred or Not specified",
      "reason_for_change": "inferred or professional default",
      "top_strengths": []
    }
  `;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      }
    );

    const result = response.data.candidates[0].content.parts[0].text;
    return JSON.parse(result);
  } catch (err) {
    const errorLog = `
--- ${new Date().toISOString()} ---
Error: ${err.message}
${err.response ? JSON.stringify(err.response.data, null, 2) : 'No response data'}
----------------------------------
`;
    fs.appendFileSync('ai_debug.log', errorLog);
    console.error('AI Processing Error:', err.message);
    
    if (err.response?.status === 429) {
      throw new Error('AI Quota Exhausted. Please wait 1 minute and try again.');
    }
    return null;
  }
}

module.exports = { processUserData };
