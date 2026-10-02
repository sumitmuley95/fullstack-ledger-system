const express = require("express")
const cookieParser = require("cookie-parser")
const path = require("path")
const fs = require("fs")


const cors = require("cors")
const app = express()

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173", // your frontend dev URL
    credentials: true // required so cookies are sent
}))


app.use(express.json())
app.use(cookieParser())

/**
 * - Routes required
 */
const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")
const transactionRoutes = require("./routes/transaction.routes")

/**
 * - Use Routes
 */

app.get("/api/health", (req, res) => {
    res.send("Ledger Service is up and running")
})

app.use("/api/auth", authRouter)
app.use("/api/accounts", accountRouter)
app.use("/api/transactions", transactionRoutes)

/**
 * - Unknown API routes -> JSON 404 (instead of Express's default HTML page)
 */
app.use("/api", (req, res) => {
    res.status(404).json({ message: "Route not found" })
})

/**
 * - Serve the built frontend (frontend/dist) if it exists.
 *   In development you run the Vite dev server instead, so this is skipped.
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
 * - Central error handler
 *   Express 5 forwards errors thrown in async controllers here. Without it,
 *   e.g. a malformed account id (CastError) returned an HTML 500 page.
 */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.name === "CastError") {
        return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` })
    }
    if (err.name === "ValidationError") {
        const message = Object.values(err.errors).map(e => e.message).join(", ")
        return res.status(400).json({ message })
    }
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Invalid JSON body" })
    }
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
})

module.exports = app
