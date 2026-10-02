const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const emailService = require("../services/email.service")
const tokenBlackListModel = require("../models/blackList.model")

/**
* - user register controller
* - POST /api/auth/register
*/
async function userRegisterController(req, res) {
    const { email, password, name } = req.body

    const isExists = await userModel.findOne({
        email: email
    })

    if (isExists) {
        return res.status(422).json({
            message: "User already exists with email.",
            status: "failed"
        })
    }

    const user = await userModel.create({
        email, password, name
    })

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

    // SECURITY FIX: Added httpOnly, secure, and sameSite flags to prevent XSS attacks
    res.cookie("token", token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production", 
        sameSite: "strict" 
    })

    res.status(201).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        }
    })

    // FIX: response is already sent, so an email failure must not bubble up
    // (it would cause an unhandled error / "headers already sent")
    try {
        await emailService.sendRegistrationEmail(user.email, user.name)
    } catch (emailError) {
        console.error("User registered, but failed to send welcome email:", emailError)
    }
}

/**
 * - User Login Controller
 * - POST /api/auth/login
  */

async function userLoginController(req, res) {
    const { email, password } = req.body

    const user = await userModel.findOne({ email }).select("+password")

    if (!user) {
        return res.status(401).json({
            message: "Email or password is INVALID"
        })
    }

    const isValidPassword = await user.comparePassword(password)

    if (!isValidPassword) {
        return res.status(401).json({
            message: "Email or password is INVALID"
        })
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

    // SECURITY FIX: Added httpOnly, secure, and sameSite flags to prevent XSS attacks
    res.cookie("token", token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production", 
        sameSite: "strict" 
    })

    res.status(200).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        }
    })

}


/**
 * - User Logout Controller
 * - POST /api/auth/logout
  */
async function userLogoutController(req, res) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]

    if (!token) {
        return res.status(200).json({
            message: "User logged out successfully"
        })
    }



    // FIX: logging out twice with the same token used to throw a duplicate-key error (500)
    const alreadyBlacklisted = await tokenBlackListModel.findOne({ token })
    if (!alreadyBlacklisted) {
        await tokenBlackListModel.create({
            token: token
        })
    }

    // FIX: clear with the same options used when setting the cookie
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    })

    res.status(200).json({
        message: "User logged out successfully"
    })

}


module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController
}
