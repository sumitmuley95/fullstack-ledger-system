// Fires several transfers from the same account at the same moment and
// checks that the balance never goes negative.
// Usage: node scripts/race-test.mjs <email> <password> <toAccountId>
const BASE = process.env.API_URL || "http://localhost:3000/api"
const [ email, password, toAccount ] = process.argv.slice(2)

if (!email || !password || !toAccount) {
    console.log("Usage: node scripts/race-test.mjs <email> <password> <toAccountId>")
    process.exit(1)
}

const login = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
})
if (!login.ok) throw new Error(`Login failed with status ${login.status}`)

const cookie = login.headers.getSetCookie().find((c) => c.startsWith("token=")).split(";")[ 0 ]
const headers = { "Content-Type": "application/json", Cookie: cookie }

const { accounts } = await (await fetch(`${BASE}/accounts`, { headers })).json()
const from = accounts.find((a) => a.status === "ACTIVE" && a.balance > 0 && a._id !== toAccount)
if (!from) throw new Error("This user needs an ACTIVE account with a positive balance")

// Each transfer is 60% of the balance, so at most ONE can succeed
const amount = Math.ceil(from.balance * 0.6)
console.log(`Balance: ${from.balance} paise. Sending ${amount} paise 5 times at once...`)

const results = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
        fetch(`${BASE}/transactions`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                fromAccount: from._id,
                toAccount,
                amount,
                idempotencyKey: `race-${Date.now()}-${i}`,
            }),
        }).then(async (r) => `${r.status} ${(await r.json()).message}`)
    )
)
results.forEach((r) => console.log("  " + r))

const after = await (await fetch(`${BASE}/accounts/balance/${from._id}`, { headers })).json()
console.log(`Final balance: ${after.balance} paise`)
console.log(after.balance >= 0 ? "PASS: no overdraft" : "FAIL: account overdrawn")