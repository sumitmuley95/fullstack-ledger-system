const jwt = require("jsonwebtoken")
const userModel = require("../models/user.model")
const tokenBlackListModel = require("../models/blackList.model")

function getToken(req) {
    return req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]
}

async function authMiddleware(req, res, next) {
    const token = getToken(req)

    if (!token) {
        return res.status(401).json({ message: "Unauthorized access, token is missing" })
    }

    // Verify the signature first, so junk tokens never reach the database
    let decoded
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch {
        return res.status(401).json({ message: "Unauthorized access, token is invalid" })
    }

    const isBlacklisted = await tokenBlackListModel.exists({ token })
    if (isBlacklisted) {
        return res.status(401).json({ message: "Unauthorized access, token is invalid" })
    }

    const user = await userModel.findById(decoded.userId).select("+systemUser")
    if (!user) {
        return res.status(401).json({ message: "User no longer exists" })
    }

    req.user = user
    next()
}

function requireSystemUser(req, res, next) {
    if (!req.user?.systemUser) {
        return res.status(403).json({ message: "Forbidden access, not a system user" })
    }
    next()
}

module.exports = {
    getToken,
    authMiddleware,
    requireSystemUser,
    // Express accepts an array of middleware, so existing routes keep working unchanged
    authSystemUserMiddleware: [ authMiddleware, requireSystemUser ],
}