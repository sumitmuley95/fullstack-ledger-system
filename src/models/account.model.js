const mongoose = require("mongoose")
const ledgerModel = require("./ledger.model")

const accountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [ true, "Account must be associated with a user" ],
        index: true
    },
    status: {
        type: String,
        enum: {
            values: [ "ACTIVE", "FROZEN", "CLOSED" ],
            message: "Status can be either ACTIVE, FROZEN or CLOSED",
        },
        default: "ACTIVE"
    },
    currency: {
        type: String,
        required: [ true, "Currency is required for creating an account" ],
        default: "INR"
    },
    lockVersion: {
        type: Number,
        default: 0,
        select: false // internal; used to serialise concurrent transfers (see Step 6)
    }
}, {
    timestamps: true
})

accountSchema.index({ user: 1, status: 1 })

accountSchema.methods.getBalance = async function (session = null) {
    const aggregateQuery = ledgerModel.aggregate([
        { $match: { account: this._id } },
        {
            $group: {
                _id: null,
                totalDebit: {
                    $sum: {
                        $cond: [ { $eq: [ "$type", "DEBIT" ] }, "$amount", 0 ]
                    }
                },
                totalCredit: {
                    $sum: {
                        $cond: [ { $eq: [ "$type", "CREDIT" ] }, "$amount", 0 ]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                balance: { $subtract: [ "$totalCredit", "$totalDebit" ] }
            }
        }
    ]);

    // Attach the session to the query if one is provided
    if (session) {
        aggregateQuery.session(session);
    }

    const balanceData = await aggregateQuery;

    if (balanceData.length === 0) {
        return 0;
    }

    return balanceData[ 0 ].balance;
}

accountSchema.statics.getBalances = async function (accountIds) {
    const rows = await ledgerModel.aggregate([
        { $match: { account: { $in: accountIds } } },
        {
            $group: {
                _id: "$account",
                balance: {
                    $sum: {
                        $cond: [
                            { $eq: [ "$type", "CREDIT" ] },
                            "$amount",
                            { $multiply: [ "$amount", -1 ] }
                        ]
                    }
                }
            }
        }
    ])

    // Map of accountId (string) -> balance in paise
    return new Map(rows.map((row) => [ String(row._id), row.balance ]))
}


const accountModel = mongoose.model("account", accountSchema)



module.exports = accountModel