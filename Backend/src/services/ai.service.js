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
    
    const systemPrompt = `You are an Expert Tech Recruiter, ATS Specialist, and Premium HTML/CSS Designer.
    Your task is to generate a 10/10 industry-standard, ATS-optimized resume in HTML format.

    CRITICAL CONTENT RULES:
    1. If the input data has no resume or missing details, use the Self Description and Job Description to build a complete resume from scratch.
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
        model: "llama-3.3-70b-versatile",
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