const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const helmet = require("helmet")
const path = require("path")
const fs = require("fs")
const HttpError = require("./utils/httpError")

const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")
const transactionRouter = require("./routes/transaction.routes")

const app = express()

// Hosting platforms (Render, Railway) sit behind a proxy. This makes req.ip
// the real client IP, which the login rate limiter depends on.
app.set("trust proxy", 1)

app.use(helmet())

// Only needed if the frontend is ever hosted on a different origin.
if (process.env.CLIENT_URL) {
    app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
}

app.use(express.json({ limit: "10kb" }))
app.use(cookieParser())

/**
 * - API routes
 */
app.get("/api/health", (req, res) => {
    res.json({ status: "ok" })
})

app.use("/api/auth", authRouter)
app.use("/api/accounts", accountRouter)
app.use("/api/transactions", transactionRouter)

// Unknown API routes get a JSON 404 instead of Express's HTML page
app.use("/api", (req, res) => {
    res.status(404).json({ message: "Route not found" })
})

/**
 * - Serve the built frontend (frontend/dist) when it exists.
 *   In development the Vite dev server is used instead.
 */
const clientDist = path.join(__dirname, "..", "frontend", "dist")
if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist))
    app.get(/^\/(?!api).*/, (req, res) => {
        res.sendFile(path.join(clientDist, "index.html"))
    })
} else {
    app.get("/", (req, res) => {
        res.send("Ledger Service is up and running")
    })
}

/**
 * - Central error handler. Express 5 forwards errors thrown in async handlers here.
 */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err instanceof HttpError) {
        return res.status(err.status).json({ message: err.message })
    }
    if (err.name === "CastError") {
        return res.status(400).json({ message: `Invalid ${err.path}` })
    }
    if (err.name === "ValidationError") {
        const message = Object.values(err.errors).map((e) => e.message).join(", ")
        return res.status(400).json({ message })
    }
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Invalid JSON body" })
    }
    if (err.type === "entity.too.large") {
        return res.status(413).json({ message: "Request body too large" })
    }

    console.error(err)
    res.status(500).json({ message: "Internal server error" })
})

module.exports = app