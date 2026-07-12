const Groq = require("groq-sdk")
const { z } = require("zod")
const puppeteer = require("puppeteer")

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
})

// Schema the AI's JSON response MUST match. If Groq returns something
// malformed (wrong types, missing fields, invalid severity, etc.) this
// will throw instead of letting bad data reach the database.
const interviewReportSchema = z.object({
    title: z.string(),
    matchScore: z.number().min(0).max(100),
    // --- NEW: makes the match score auditable instead of a black-box number.
    // requiredSkills = what the JD actually asks for.
    // matchedSkills  = subset of requiredSkills the resume/self-description evidences.
    // skillGaps (below) = the rest of requiredSkills that are missing/weak.
    // matchScore must now be internally consistent with these two lists.
    requiredSkills: z.array(z.string()).max(12),
    matchedSkills: z.array(z.string()),
    technicalQuestions: z.array(z.object({
        question: z.string(),
        intention: z.string(),
        answer: z.string()
    })),
    behavioralQuestions: z.array(z.object({
        question: z.string(),
        intention: z.string(),
        answer: z.string()
    })),
    // --- IMPROVED skillGaps ---
    // "reason" forces the model to justify each gap against the actual resume
    // instead of guessing, and "recommendation" makes each gap actionable
    // instead of just a label.
    skillGaps: z.array(z.object({
        skill: z.string(),
        severity: z.enum([ "low", "medium", "high" ]),
        reason: z.string(),
        recommendation: z.string()
    })).max(8),
    // --- IMPROVED preparationPlan (the "roadmap") ---
    // "targetSkill" ties every day to a real gap instead of generic advice,
    // so the roadmap is actually personalized to this candidate + this job.
    preparationPlan: z.array(z.object({
        day: z.number(),
        focus: z.string(),
        targetSkill: z.string(),
        tasks: z.array(z.string())
    }))
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

STEP 1 — REQUIRED VS MATCHED SKILLS (do this before anything else, it drives every other field):
1. Read the Job Description and extract the 8-12 most important required skills/tools/technologies → this is "requiredSkills".
2. For each item in requiredSkills, check the Resume and Self Description. If it is clearly evidenced there, add it to "matchedSkills". If it is missing or only weakly implied, it does NOT go in matchedSkills — it becomes a skillGaps entry instead (see SKILL GAP RULES below).
3. matchScore MUST be consistent with these two lists: a high ratio of matchedSkills to requiredSkills, plus few/low-severity skillGaps, means a high score. A low ratio, or several high-severity skillGaps, means a low score. Never output a matchScore that contradicts your own requiredSkills/matchedSkills/skillGaps.

QUESTION TYPE RULES (do not let these two categories bleed into each other):
- technicalQuestions test hands-on knowledge of a specific tool, technology, or concept from requiredSkills or the resume's stack — e.g. "How would you debug a memory leak in a Node.js service?" These must NOT be about past personal experience, teamwork, or soft skills.
- behavioralQuestions are situational/STAR-style, about how the candidate has acted or would act — conflict, deadlines, failure, collaboration, ownership — e.g. "Tell me about a time a project's scope changed midway. How did you handle it?" These must NOT test a specific technical tool or syntax.
- Every question must clearly belong to only one of the two categories.

Generate EXACTLY 5 technicalQuestions and EXACTLY 5 behavioralQuestions.

PREPARATION PLAN RULES (this is the candidate's roadmap — make it personal, not generic):
1. Generate a preparationPlan with EXACTLY 5 days, numbered 1 to 5 in order.
2. Each day's "focus" and "targetSkill" MUST target a real skillGaps entry, prioritizing high severity gaps in the earlier days.
3. If there are fewer than 5 skillGaps, use the remaining days to deepen the candidate's weakest matchedSkills relative to the Job Description, or add a mock-interview/revision day — set "targetSkill" to that skill or to "Mock Interview Practice" accordingly. Never leave a day with generic filler unrelated to requiredSkills.
4. "tasks" must be specific and doable in one day (e.g. "Build a small REST API with pagination and JWT auth"), not vague advice like "study more".

SKILL GAP RULES (skillGaps field — follow this strictly):
1. First extract the required skills, tools, and technologies explicitly mentioned in the Job Description.
2. Compare each one, one by one, against what is explicitly present in the Resume and Self Description.
3. Only include a skill in "skillGaps" if it is REQUIRED by the Job Description AND is missing, weak, or not clearly evidenced in the Resume/Self Description.
4. Do NOT include a skill the candidate already clearly demonstrates — that should count toward matchScore instead, not appear as a gap.
5. For each skillGaps entry:
   - "skill": the exact skill/technology name as it appears in the Job Description.
   - "severity": "high" if it is a core/critical requirement for the role, "medium" if important but secondary, "low" if it's a nice-to-have.
   - "reason": one short sentence, grounded in the actual resume/self description, explaining why this is a gap (e.g. what is missing or only partially shown). Never invent resume content while writing this.
   - "recommendation": one concrete, actionable next step to close this gap (a specific project idea, certification, or practice focus — not generic advice like "learn more about X").
6. Order skillGaps from highest severity to lowest.
7. Include at most 8 skillGaps — pick the most impactful ones for this specific job description, not every minor missing tool.
8. If the candidate genuinely meets almost every required skill, skillGaps may contain very few entries (even zero) — do not invent gaps just to fill the list.

Return EXACTLY this JSON shape (types must match, no extra fields, no missing fields):

{
  "title": "string",
  "matchScore": 0,
  "requiredSkills": ["string"],
  "matchedSkills": ["string"],
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
      "severity": "low",
      "reason": "string",
      "recommendation": "string"
    }
  ],
  "preparationPlan": [
    {
      "day": 1,
      "focus": "string",
      "targetSkill": "string",
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
        response_format: { type: "json_object" },
        // Low temperature + fixed seed so the same resume/JD pair gives the
        // same matchScore every time, instead of a different number each run.
        temperature: 0.1,
        seed: 42
    })

    const rawText = response.choices[0].message.content

    console.log("RAW:", rawText)

    const parsedResponse = JSON.parse(rawText)

    // Throws a clear error naming exactly which field is wrong, instead of
    // silently saving broken/inconsistent data to MongoDB.
    try {
        return interviewReportSchema.parse(parsedResponse)
    } catch (validationError) {
        console.error("AI response failed schema validation:", validationError.issues)
        throw new Error("AI returned an incorrectly formatted report. Please try generating again.")
    }
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
        printBackground: true,
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
    4. KEYWORD OPTIMIZATION (this is the main ATS-matching step, do not skip it):
   - First, extract the 10-15 most important skills, tools, technologies, and role-specific terms from the Job Description (e.g. "React.js", "REST APIs", "cross-browser compatibility", "responsive design", "Agile").
   - For every one of those keywords the candidate genuinely has evidence of (in their resume or self description), make sure that EXACT keyword phrase appears somewhere in the output — in the Skills list, or naturally worked into a bullet point. Do not just paraphrase a keyword into a synonym; ATS systems match literal keyword text.
   - Do NOT add a keyword for a skill the candidate has no evidence of — that would violate the fact rule above. Skipping an unearned keyword is correct behavior, not a failure.
   - The Skills section should be reordered so keywords that also appear in the Job Description come first.

    JSON FORMATTING RULES:
    1. Return ONLY a valid JSON object with a single field "html".
    2. CRITICAL ERROR PREVENTION: The value of the "html" key must be a plain, standard JSON string wrapper. NEVER use triple quotes like \"\"\" or backticks (\`\`\`) inside or around the HTML content. Escape double quotes as \\" where needed inside the HTML string.
    3. The HTML must fit on a single A4 page (210mm x 297mm) without overflow or breaking to a second page.
    4. Use clean, semantic HTML with your own inline or embedded CSS styling — keep it professional and readable, well-organized into clear sections (Header, Summary, Skills, Experience, Projects, Education, Languages), omitting any section with no real content.
    5. Page and body background MUST be white (#ffffff) or a very light neutral color. NEVER use a black, dark, or colored full-page background — this is a printed resume, not a dark-mode UI.
    6. NEVER write the two literal characters backslash-n (as in \\n) as visible text content anywhere in the HTML, and never insert stray newline characters between tags purely for formatting. Whitespace between elements must come from real HTML/CSS (margin, padding, <br> if truly needed) — not from escape-sequence text nodes. Every "\\n" you might be tempted to add for readability of the JSON string must instead just be a plain space or nothing.
    7. SKILLS SECTION FORMATTING: a comma immediately after each skill (except the last one) is MANDATORY — e.g. "HTML5, CSS3, JavaScript (ES6+), React.js" — this comma must be present even if you also style skills as pill/chip spans with background and border-radius. Extra whitespace or a larger gap between words is NOT a substitute for a comma and does NOT satisfy this rule. Skills must never appear as "HTML5   CSS3   JavaScript" (space-only separation) under any circumstance — always literally type the comma character.
       Example of a CORRECT skills line: <p>HTML5, CSS3, JavaScript (ES6+), React.js, React Router, SCSS/Sass, Flexbox, CSS Grid, Git &amp; GitHub</p>
       Example of an INCORRECT skills line (never do this): <p>HTML5   CSS3   JavaScript (ES6+)   React.js</p>
    8. COLOR SCHEME (mandatory, use exactly this):
       - The candidate's name and every section title (Professional Summary, Technical Skills, Professional Experience, Education, Projects, etc.) must be colored light blue: #3b82f6.
       - Every section title must have a bottom border in that same light blue: border-bottom: 1.5px solid #3b82f6; with a few pixels of padding-bottom so the line doesn't touch the text.
       - Body text (paragraphs, bullet points, contact line, dates) stays in a normal dark/black or dark-gray color for readability — only the name and section titles use the light blue.`;

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

    // Safety net: even with the prompt rule above, models sometimes still leak
    // literal "\n" (backslash + n, two visible characters) into text content.
    // Strip those out so they never show up as visible text in the PDF.
    const cleanedHtml = jsonContent.html.replace(/\\n/g, " ");

    console.log("RESUME HTML:", cleanedHtml);

    const pdfBuffer = await generatePdfFromHtml(cleanedHtml);

    return pdfBuffer;

}
module.exports = { generateInterviewReport, generateResumePdf }