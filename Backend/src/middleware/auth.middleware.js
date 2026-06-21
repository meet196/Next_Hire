const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")

async function authUser(req, res, next) {
    console.log("COOKIES RECEIVED:", req.cookies)
    const token = req.cookies.token
    if (!token) {
        return res.status(401).json({
            message: "Token not provided."
        })
    }
    const isTokenBlacklisted = await tokenBlacklistModel.findOne({token})
    console.log("IS BLACKLISTED:", isTokenBlacklisted)
    if (isTokenBlacklisted) {
        return res.status(401).json({
            message: "token is invalid"
        })
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        console.log("DECODED SUCCESSFULLY:", decoded)
        req.user = decoded
        next()
    } catch (err) {
        console.log("JWT VERIFY ERROR:", err.message)
        return res.status(401).json({
            message: "Invalid token."
        })
    }

}


module.exports = { authUser }