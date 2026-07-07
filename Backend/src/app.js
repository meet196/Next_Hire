/* require all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require('./routes/interview.routes')
const adminRoutes = require("./routes/admin.routes");


const express = require("express")
const cookieParser = require("cookie-parser")
const cors =require('cors')

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: ["http://localhost:5173", "https://next-hire-inky.vercel.app"],
    credentials: true
}))

/* using all the routes here */
app.use("/api/auth", authRouter)
app.use('/api/interview', interviewRouter)
app.use("/api/admin", adminRoutes);



module.exports = app