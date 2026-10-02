const express = require("express")
const rateLimit = require("express-rate-limit")
const authController = require("../controllers/auth.controller")
const { authMiddleware } = require("../middleware/auth.middleware")

const router = express.Router()

// Slows down password guessing: 20 attempts per IP per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many attempts, please try again in 15 minutes" },
})

/* POST /api/auth/register */
router.post("/register", authLimiter, authController.userRegisterController)

/* POST /api/auth/login */
router.post("/login", authLimiter, authController.userLoginController)

/* POST /api/auth/logout */
router.post("/logout", authController.userLogoutController)

/* GET /api/auth/me */
router.get("/me", authMiddleware, authController.getMeController)

module.exports = router