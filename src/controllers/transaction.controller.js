const mongoose = require("mongoose")
const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const HttpError = require("../utils/httpError")

const isObjectIdString = (value) => typeof value === "string" && /^[a-f\d]{24}$/i.test(value)
const isValidAmount = (value) => Number.isSafeInteger(value) && value > 0
const isValidKey = (value) => typeof value === "string" && value.length >= 8 && value.length <= 100

/**
 * A retry with the same idempotency key must describe the same transfer.
 * Otherwise the client has a bug, and we refuse rather than guess.
 */
function replay(existing, { fromAccountId, toAccountId, amount }) {
    const samePayload =
        existing.fromAccount.equals(fromAccountId) &&
        existing.toAccount.equals(toAccountId) &&
        existing.amount === amount

    if (!samePayload) {
        throw new HttpError(409, "This idempotency key was already used for a different transfer")
    }
    return { transaction: existing, created: false }
}

/**
 * Moves `amount` paise between two accounts as one atomic MongoDB transaction:
 * one transaction record, one DEBIT entry and one CREDIT entry, or nothing at all.
 */
async function executeTransfer({
    userId,
    fromAccountId,
    toAccountId,
    amount,
    idempotencyKey,
    allowNegativeBalance = false,
}) {
    // Fast path for client retries
    const existing = await transactionModel.findOne({ initiatedBy: userId, idempotencyKey })
    if (existing) {
        return replay(existing, { fromAccountId, toAccountId, amount })
    }

    const session = await mongoose.startSession()

    try {
        let transaction

        // withTransaction commits on success, aborts on error, and retries
        // automatically on transient errors such as write conflicts.
        await session.withTransaction(async () => {
            // Writing to the sender's account makes concurrent transfers from
            // the same account conflict, so they're processed one at a time.
            // The `user` filter also enforces that the caller owns this account.
            const from = await accountModel.findOneAndUpdate(
                { _id: fromAccountId, user: userId },
                { $inc: { lockVersion: 1 } },
                { session, returnDocument: "after" }
            )
            const to = await accountModel.findById(toAccountId).session(session)

            if (!from || !to) {
                throw new HttpError(404, "Account not found")
            }
            if (from.status !== "ACTIVE" || to.status !== "ACTIVE") {
                throw new HttpError(400, "Both accounts must be ACTIVE")
            }
            if (from.currency !== to.currency) {
                throw new HttpError(400, "Accounts must use the same currency")
            }

            if (!allowNegativeBalance) {
                const balance = await from.getBalance(session)
                if (balance < amount) {
                    throw new HttpError(400, "Insufficient balance")
                }
            }

            ;[ transaction ] = await transactionModel.create([ {
                fromAccount: from._id,
                toAccount: to._id,
                initiatedBy: userId,
                amount,
                idempotencyKey,
                status: "COMPLETED",
            } ], { session })

            await ledgerModel.create([
                { account: from._id, amount, transaction: transaction._id, type: "DEBIT" },
                { account: to._id, amount, transaction: transaction._id, type: "CREDIT" },
            ], { session, ordered: true })
        })

        return { transaction, created: true }
    } catch (err) {
        // Two identical requests raced past the fast path: the unique index
        // stopped the second one, so return the transfer that won
        if (err.code === 11000) {
            const winner = await transactionModel.findOne({ initiatedBy: userId, idempotencyKey })
            if (winner) {
                return replay(winner, { fromAccountId, toAccountId, amount })
            }
        }
        throw err
    } finally {
        await session.endSession()
    }
}

/**
 * - POST /api/transactions
 * - Body: { fromAccount, toAccount, amount (paise), idempotencyKey }
 */
async function createTransaction(req, res) {
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body

    if (!isObjectIdString(fromAccount) || !isObjectIdString(toAccount)) {
        throw new HttpError(400, "Valid fromAccount and toAccount IDs are required")
    }
    if (!isValidAmount(amount)) {
        throw new HttpError(400, "amount must be a positive whole number of paise")
    }
    if (!isValidKey(idempotencyKey)) {
        throw new HttpError(400, "A valid idempotencyKey (8-100 characters) is required")
    }
    if (fromAccount === toAccount) {
        throw new HttpError(400, "Source and destination accounts must be different")
    }

    const { transaction, created } = await executeTransfer({
        userId: req.user._id,
        fromAccountId: fromAccount,
        toAccountId: toAccount,
        amount,
        idempotencyKey,
    })

    if (created) {
        emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount)
            .catch((err) => console.error("Transfer succeeded, but email failed:", err.message))
    }

    res.status(created ? 201 : 200).json({
        message: created ? "Transaction completed successfully" : "Transaction already processed",
        transaction,
    })
}

/**
 * - POST /api/transactions/system/initial-funds
 * - The system account may go negative: that's how money enters the ledger.
 */
async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body

    if (!isObjectIdString(toAccount)) {
        throw new HttpError(400, "A valid toAccount ID is required")
    }
    if (!isValidAmount(amount)) {
        throw new HttpError(400, "amount must be a positive whole number of paise")
    }
    if (!isValidKey(idempotencyKey)) {
        throw new HttpError(400, "A valid idempotencyKey (8-100 characters) is required")
    }

    const systemAccount = await accountModel.findOne({ user: req.user._id, status: "ACTIVE" })
    if (!systemAccount) {
        throw new HttpError(400, "The system user needs an ACTIVE account to issue funds from")
    }
    if (systemAccount._id.equals(toAccount)) {
        throw new HttpError(400, "Cannot issue funds to the system account itself")
    }

    const { transaction, created } = await executeTransfer({
        userId: req.user._id,
        fromAccountId: systemAccount._id,
        toAccountId: toAccount,
        amount,
        idempotencyKey,
        allowNegativeBalance: true,
    })

    res.status(created ? 201 : 200).json({
        message: created ? "Initial funds issued successfully" : "Transaction already processed",
        transaction,
    })
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction,
}