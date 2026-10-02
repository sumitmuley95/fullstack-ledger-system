const jwt = require("jsonwebtoken")
const userModel = require("../models/user.model")
const tokenBlackListModel = require("../models/blackList.model")
const emailService = require("../services/email.service")
const { setCookieOptions, clearCookieOptions } = require("../config/cookie")
const { getToken } = require("../middleware/auth.middleware")

function issueToken(res, user) {
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })
    res.cookie("token", token, setCookieOptions)
}

// The only user fields the frontend ever sees
function publicUser(user) {
    return {
        _id: user._id,
        email: user.email,
        name: user.name,
        systemUser: Boolean(user.systemUser),
    }
}

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0

/**
 * - POST /api/auth/register
 */
async function userRegisterController(req, res) {
    const { name, email, password } = req.body

    if (!isNonEmptyString(name) || !isNonEmptyString(email) || typeof password !== "string") {
        return res.status(400).json({ message: "Name, email and password are required" })
    }
    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" })
    }

    // The unique index on email is the real duplicate check. A findOne() first
    // would still let two simultaneous sign-ups through.
    let user
    try {
        user = await userModel.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
        })
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "An account with this email already exists" })
        }
        throw err
    }

    issueToken(res, user)
    res.status(201).json({ user: publicUser(user) })

    // Fire-and-forget: a slow or failing mail server shouldn't affect sign-up
    emailService.sendRegistrationEmail(user.email, user.name)
        .catch((err) => console.error("Failed to send welcome email:", err.message))
}

/**
 * - POST /api/auth/login
 */
async function userLoginController(req, res) {
    const { email, password } = req.body

    if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Email and password are required" })
    }

    const user = await userModel
        .findOne({ email: email.trim().toLowerCase() })
        .select("+password +systemUser")

    // Same message for both cases, so attackers can't tell which emails exist
    if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: "Email or password is invalid" })
    }

    issueToken(res, user)
    res.status(200).json({ user: publicUser(user) })
}

/**
 * - GET /api/auth/me
 * - The frontend can't read the httpOnly cookie, so it asks the server who is logged in.
 */
async function getMeController(req, res) {
    res.status(200).json({ user: publicUser(req.user) })
}

/**
 * - POST /api/auth/logout
 */
async function userLogoutController(req, res) {
    const token = getToken(req)

    // Only blacklist tokens we actually issued, so this endpoint
    // can't be used to fill the collection with junk
    let isValidToken = false
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET)
            isValidToken = true
        } catch {
            // expired or forged: nothing to revoke
        }
    }

    if (isValidToken) {
        // upsert makes logging out twice harmless
        await tokenBlackListModel.updateOne(
            { token },
            { $setOnInsert: { token } },
            { upsert: true }
        )
    }

    res.clearCookie("token", clearCookieOptions)
    res.status(200).json({ message: "User logged out successfully" })
}

module.exports = {
    userRegisterController,
    userLoginController,
    getMeController,
    userLogoutController,
}