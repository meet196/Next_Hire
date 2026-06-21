const Groq = require("groq-sdk")
const { z } = require("zod")
const chromium = require("@sparticuz/chromium")
const puppeteer = require("puppeteer-core")

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    const prompt = `
You are a JSON API.

Return ONLY valid JSON.
Do not return explanation.
Do not return markdown.
Do not return candidate summary fields like candidate_name, role_applied_for, recommendation, candidate_score.
Generate EXACTLY 5 technical questions and EXACTLY 5 behavioral questions. Do not generate fewer than 5 in each section.
Generate a preparation plan covering EXACTLY 7 days. Do not generate fewer than 7 days in the preparationPlan array.
Use a clean, modern, professional design with a single accent color (like navy blue or dark teal) for headings and section dividers. Use proper spacing, a clear visual hierarchy, and avoid cluttered or overly colorful styling. The layout should look like a premium resume template, similar to ones used on LinkedIn or Canva.

You must return EXACTLY this structure:

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
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
    })
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    
    // 1. The System Prompt: This forces Groq to act like a Senior Recruiter and format the HTML perfectly.
    const systemPrompt = `You are an Expert Tech Recruiter, ATS Specialist, and HTML/CSS Designer.
    Your task is to generate a highly professional, ATS-friendly resume in HTML format.

    CRITICAL RULES FOR CONTENT (To match elite industry standards):
    1. QUANTIFY IMPACT: Do not just list duties. Enhance the bullet points with believable, industry-standard metrics where appropriate (e.g., "improving API response times by 30%", "reducing runtime errors"[cite: 2]).
    2. TECHNICAL DEPTH: Expand simple terms based on the Job Description. If they know MongoDB, use advanced terms like "advanced aggregation pipelines and strategic indexing"[cite: 2].
    3. CRISP STRUCTURE: Organize strictly into: Professional Summary, Technical Skills (categorized into Languages, Frontend, Backend, Database, Tools & DevOps)[cite: 2], Professional Experience, Projects, and Education.
    4. ACTION VERBS: Start every bullet point with strong verbs like "Architected", "Implemented", "Designed", or "Collaborated"[cite: 2].
    5. HUMAN TONE: Make it sound written by a senior professional, not an AI. 

    CRITICAL RULES FOR DESIGN & HTML:
    1. Return ONLY a valid JSON object with a single field "html" containing the raw HTML code.
    2. Use inline CSS or a <style> block within the HTML. The design must be clean, modern, and professional.
    3. Use a single accent color (like dark navy blue #1E3A8A or dark teal) for headers and dividers.
    4. Ensure it fits well within 1-2 A4 pages. Use clear visual hierarchy, proper spacing, and standard ATS-friendly fonts (e.g., Arial, Helvetica, sans-serif).
    5. Ensure the HTML is fully complete and ready to be parsed by Puppeteer.`;

    // 2. The User Prompt: This only contains the dynamic data.
    const userPrompt = `Please generate the ATS-optimized HTML resume based on the following details. Tailor the content heavily towards the Job Description.

    Resume: ${resume}
    Self Description: ${selfDescription}
    Job Description: ${jobDescription}`;

    const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        // IMPORTANT: Lower temperature makes the model more analytical and less "creative/hallucinatory", which is better for resumes.
        temperature: 0.25 
    });

    const jsonContent = JSON.parse(response.choices[0].message.content);

    if (!jsonContent.html) {
        throw new Error("AI did not return the 'html' field in JSON.");
    }

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html);

    return pdfBuffer;
}

module.exports = { generateInterviewReport, generateResumePdf }