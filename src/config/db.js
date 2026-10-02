const mongoose = require("mongoose")

// Neutralises MongoDB operators like $ne / $gt that arrive in user input,
// e.g. { "idempotencyKey": { "$ne": null } }, so they're treated as plain values.
mongoose.set("sanitizeFilter", true)

async function connectToDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("Connected to MongoDB")
    } catch (err) {
        console.error("Error connecting to MongoDB:", err.message)
        process.exit(1)
    }
}

module.exports = connectToDB