const mongoose = require("mongoose")

const transactionSchema = new mongoose.Schema({
    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [ true, "Transaction must be associated with a from account" ],
        index: true
    },
    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [ true, "Transaction must be associated with a to account" ],
        index: true
    },
    initiatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [ true, "Transaction must record who initiated it" ]
    },
    status: {
        type: String,
        enum: {
            values: [ "PENDING", "COMPLETED", "FAILED", "REVERSED" ],
            message: "Status can be either PENDING, COMPLETED, FAILED or REVERSED",
        },
        default: "PENDING"
    },
    amount: {
        type: Number,
        required: [ true, "Amount is required for creating a transaction" ],
        min: [ 1, "Amount must be at least 1 paisa" ],
        validate: {
            validator: Number.isInteger,
            message: "Amount must be a whole number of paise"
        }
    },
    idempotencyKey: {
        type: String,
        required: [ true, "Idempotency Key is required for creating a transaction" ]
    }
}, {
    timestamps: true
})

// A key only has to be unique for the user who sent it. A global unique key
// would let one user's request collide with (and reveal) another user's transaction.
transactionSchema.index({ initiatedBy: 1, idempotencyKey: 1 }, { unique: true })

const transactionModel = mongoose.model("transaction", transactionSchema)

module.exports = transactionModel