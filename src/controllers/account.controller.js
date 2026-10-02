const accountModel = require("../models/account.model")
const HttpError = require("../utils/httpError")

const MAX_ACCOUNTS_PER_USER = 5

/**
 * - POST /api/accounts
 */
async function createAccountController(req, res) {
    const count = await accountModel.countDocuments({ user: req.user._id })
    if (count >= MAX_ACCOUNTS_PER_USER) {
        throw new HttpError(400, `You can open at most ${MAX_ACCOUNTS_PER_USER} accounts`)
    }

    const account = await accountModel.create({ user: req.user._id })

    res.status(201).json({
        account: { ...account.toObject(), lockVersion: undefined, balance: 0 }
    })
}

/**
 * - GET /api/accounts
 * - Returns every account of the logged-in user with its balance (paise)
 */
async function getUserAccountsController(req, res) {
    const accounts = await accountModel
        .find({ user: req.user._id })
        .sort({ createdAt: 1 })
        .lean()

    const balances = await accountModel.getBalances(accounts.map((a) => a._id))

    res.status(200).json({
        accounts: accounts.map((account) => ({
            ...account,
            balance: balances.get(String(account._id)) ?? 0,
        })),
    })
}

/**
 * - GET /api/accounts/balance/:accountId
 */
async function getAccountBalanceController(req, res) {
    const account = await accountModel.findOne({
        _id: req.params.accountId,
        user: req.user._id,
    })

    if (!account) {
        throw new HttpError(404, "Account not found")
    }

    const balance = await account.getBalance()

    res.status(200).json({ accountId: account._id, balance })
}

module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController,
}