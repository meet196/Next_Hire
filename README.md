# Next Hire - AI-Powered Interview Preparation Platform
Next Hire is a full-stack AI-powered interview preparation web application built with the MERN stack. It allows users to upload resumes, analyze job descriptions, generate AI-based interview reports, identify skill gaps, receive personalized preparation plans, and create tailored resumes for specific job roles. 
<img width="1755" height="776" alt="Screenshot 2026-06-01 144245" src="https://github.com/user-attachments/assets/763fedf3-c1e6-416a-bea2-5ef4eedbee7a" />
<img width="1709" height="753" alt="Screenshot 2026-06-01 144256" src="https://github.com/user-attachments/assets/e89322c9-e0fc-4fb3-bae7-7be28b434d5a" />

## Features
- JWT auth with protected routes
- Resume PDF upload + AI analysis
- Personalised interview questions & skill gap report
- Download tailored resume as PDF

## Tech Stack
React.js · Node.js · Express.js · MongoDB · Google GenAI · JWT

## Getting Started
git clone https://github.com/meet196/Next_Hire
cd Next_Hire && npm install
# Add .env file (see .env.example)
npm run dev

## Live Demo
<img width="1748" height="749" alt="Screenshot 2026-06-01 144304" src="https://github.com/user-attachments/assets/cce0c53e-8aea-4534-978b-617a1b840334" />
<img width="1719" height="877" alt="Screenshot 2026-06-01 144355" src="https://github.com/user-attachments/assets/f0f224ef-7142-4686-bd0c-266a9e5cd672" />


##.env file repo
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_google_genai_key
PORT=3000

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
