const Groq = require("groq-sdk")
const { z } = require("zod")
const puppeteer = require("puppeteer")

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    const prompt = `
You are an expert ATS Resume Analyzer and Technical Recruiter.

Return ONLY valid JSON.
Do not return markdown.
Do not return explanations.

IMPORTANT SCORING RULES:

1. Calculate the match score ONLY from the ORIGINAL resume and self description.
2. NEVER assume experience, projects, internships, achievements, or skills that are not explicitly mentioned.
3. NEVER give credit for technologies that are missing from the resume.
4. Missing required skills MUST reduce the score.
5. Do NOT increase the score because you can rewrite the resume professionally.
6. Be strict and realistic like a real recruiter.

Scoring Guidelines:
90-100 = Candidate satisfies almost every required skill and has relevant experience.
75-89 = Candidate satisfies most required skills with only a few missing.
60-74 = Candidate satisfies some important skills but has several missing requirements.
40-59 = Candidate has basic knowledge but lacks many required skills.
0-39 = Candidate is not suitable for this role.

While calculating the score, consider:
- Required technical skills
- Relevant projects
- Relevant experience
- Education
- Resume completeness
- Alignment with the job description

Return EXACTLY this JSON:

{
  "title": "string",
  "matchScore": 0,
  "technicalQuestions": [
    {
      "question": "string",
      "intention": "string",
      "answer": "string"
    }
  ],
  "behavioralQuestions": [
    {
      "question": "string",
      "intention": "string",
      "answer": "string"
    }
  ],
  "skillGaps": [
    {
      "skill": "string",
      "severity": "low"
    }
  ],
  "preparationPlan": [
    {
      "day": 1,
      "focus": "string",
      "tasks": ["string"]
    }
  ]
}

Generate the response using this data:

Resume:
${resume.slice(0, 3000)}

Self Description:
${selfDescription.slice(0, 1000)}

Job Description:
${jobDescription.slice(0, 2000)}
`
    const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
    })

    const rawText = response.choices[0].message.content

    console.log("RAW:", rawText)

    const parsedResponse = JSON.parse(rawText)

    if (
        !parsedResponse.title ||
        !Array.isArray(parsedResponse.technicalQuestions) ||
        !Array.isArray(parsedResponse.behavioralQuestions) ||
        !Array.isArray(parsedResponse.skillGaps) ||
        !Array.isArray(parsedResponse.preparationPlan)
    ) {
        throw new Error("AI returned wrong format")
    }

    return parsedResponse
}

async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch({
        headless: true,
    });

    const page = await browser.newPage();

    await page.setContent(htmlContent, {
        waitUntil: "networkidle0",
    });

    const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm",
        },
    });

    await browser.close();

    return pdfBuffer;
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    
    const systemPrompt = `You are an Expert Tech Recruiter, ATS Specialist, and Premium HTML/CSS Designer.
    Your task is to generate a 10/10 industry-standard, ATS-optimized resume in HTML format.

    CRITICAL CONTENT RULES:
    1. CRITICAL FACT RULE: 
   - If a resume is provided, use ONLY the companies, projects, job titles, and experience mentioned in that resume. Do NOT invent new companies, projects, or experience that isn't there. You may rephrase, improve the wording, and add stronger action verbs/keywords aligned with the Job Description — but the underlying facts (which companies, which projects, what was actually done) must stay exactly as given in the resume.
   - If no resume is provided (resume is empty), build the resume using ONLY what the candidate wrote in their Self Description. Improve the wording and structure to sound professional, but do not invent specific company names, project names, or experiences that the candidate did not mention themselves.
   - In both cases: you are allowed to improve language, add structure, and align phrasing with the Job Description — but you are NEVER allowed to fabricate facts (company names, project names, employers) that were not actually provided by the candidate.
    2. Eliminate any AI placeholders like "Although not explicitly mentioned" or logical contradictions. Fix them to align with a professional senior developer profile.
    3. Use powerful action verbs (e.g., "Architected", "Optimized", "Designed") and quantifiable metrics.

    CRITICAL DESIGN & JSON FORMATTING RULES:
    1. Return ONLY a valid JSON object with a single field "html".
    2. CRITICAL ERROR PREVENTION: The value of the "html" key must be a plain, standard JSON string wrapper. NEVER use triple quotes like \"\"\" or backticks (\`\`\`) inside or around the HTML content. Escape double quotes as \\" where needed inside the HTML string.
    3. The HTML must use a clean, executive look with strict A4 dimensions (@page { size: A4; margin: 0; } and page dimensions 210mm x 297mm).
    4. Use a single professional accent color (like deep navy blue #1e3a8a) for section headers and lines. Use premium charcoal colors (#0f172a, #334155) for text.
    5. Ensure the visual hierarchy is perfectly spaced so it prints on a single, clean page without breaking.`;

    const userPrompt = `Generate a competitive selection-based resume using this data. Tailor it exactly for the target Job Description:
    
    Resume: ${resume || "Not provided - generate entirely from details below"}
    Self Description: ${selfDescription}
    Job Description: ${jobDescription}`;

    const response = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        // Temperature thoda sa low kiya hai taaki strict formatting follow ho aur creativity ke chakkar me JSON na toote
        temperature: 0.15 
    });

    const jsonContent = JSON.parse(response.choices[0].message.content);

    if (!jsonContent.html) {
        throw new Error("Groq API error: HTML field missing in response.");
    }

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html);
 
    return pdfBuffer;
    
}
module.exports = { generateInterviewReport, generateResumePdf }