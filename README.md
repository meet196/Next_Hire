# Next Hire

Next Hire is a full-stack AI-powered interview preparation web application.  
It lets users register, log in, upload a resume PDF, submit a self-description and job description, and generate an AI-based interview report. It also supports generating a tailored resume PDF from saved interview data.

---

## Features

### Authentication
- User registration
- User login
- User logout
- Get current logged-in user
- JWT-based authentication using cookies
- Blacklisted token logout flow

### Interview Report
- Upload resume PDF
- Extract text from uploaded resume
- Generate AI-based interview report
- Save reports to MongoDB
- View all saved interview reports
- View single interview report by ID
- Generate a tailored resume PDF

### AI Report Includes
- Job title
- Match score
- Technical interview questions
- Behavioral interview questions
- Skill gaps with severity
- Day-wise preparation plan

---

## Project Structure

```bash
Next_Hire/
├── Backend/
│   ├── server.js
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       └── services/
└── Frontend/
    ├── package.json
    └── src/
