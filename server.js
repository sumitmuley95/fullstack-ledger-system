require("dotenv").config()

// db.js must load first: it enables query sanitization before any model is used
const connectToDB = require("./src/config/db")
const app = require("./src/app")

const REQUIRED_ENV = [ "MONGO_URI", "JWT_SECRET" ]
const missing = REQUIRED_ENV.filter((key) => !process.env[ key ])
if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`)
    process.exit(1)
}

const PORT = process.env.PORT || 3000

async function start() {
    await connectToDB()
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`)
    })
}

start()