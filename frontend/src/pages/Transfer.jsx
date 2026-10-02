import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { accountApi, formatINR, newIdempotencyKey, transactionApi } from "../api"
import Alert from "../components/Alert"
import Receipt from "../components/Receipt"

export default function Transfer() {
  const [params] = useSearchParams()
  const [accounts, setAccounts] = useState([])
  const [balances, setBalances] = useState({})
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ fromAccount: params.get("from") || "", toAccount: "", amount: "" })
  // One key per transfer *intent*. A retry of the same form reuses it, so the
  // backend can't process the same transfer twice. Editing the form = new intent.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState(null)

  useEffect(() => {
    ;(async () => {
      try {
        const { accounts } = await accountApi.list()
        const active = accounts.filter((a) => a.status === "ACTIVE")
        setAccounts(active)
        const res = await Promise.allSettled(active.map((a) => accountApi.balance(a._id)))
        const map = {}
        res.forEach((r, i) => (map[active[i]._id] = r.status === "fulfilled" ? r.value.balance : null))
        setBalances(map)
        setForm((f) => ({ ...f, fromAccount: f.fromAccount || active[0]?._id || "" }))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setIdempotencyKey(newIdempotencyKey())
    setResult(null)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setResult(null)
    setBusy(true)
    try {
      const data = await transactionApi.transfer({
        fromAccount: form.fromAccount,
        toAccount: form.toAccount.trim(),
        amount: Number(form.amount),
        idempotencyKey,
      })
      setResult(data)
      if (data.transaction) {
        const { balance } = await accountApi.balance(form.fromAccount)
        setBalances((b) => ({ ...b, [form.fromAccount]: balance }))
        setForm((f) => ({ ...f, toAccount: "", amount: "" }))
        setIdempotencyKey(newIdempotencyKey())
      }
    } catch (err) {
      setError(err.message) // key is kept, so pressing Send again is a safe retry
    } finally {
      setBusy(false)
    }
  }

  const fromBalance = balances[form.fromAccount]
  const ownOthers = accounts.filter((a) => a._id !== form.fromAccount)

  if (!loading && accounts.length === 0) {
    return (
      <div className="card empty">
        <h2>No active account to send from</h2>
        <p className="muted">Open an account on the Accounts page first.</p>
        <Link className="btn btn-primary" to="/">Go to accounts</Link>
      </div>
    )
  }

  return (
    <>
      <section className="page-head">
        <div>
          <p className="eyebrow">Move money</p>
          <h1>Transfer</h1>
        </div>
      </section>

      <div className="split">
        <form className="card form" onSubmit={onSubmit}>
          <Alert>{error}</Alert>

          <label>
            From
            <select name="fromAccount" value={form.fromAccount} onChange={onChange} required disabled={loading}>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  …{a._id.slice(-8)} · {balances[a._id] == null ? "—" : formatINR(balances[a._id])}
                </option>
              ))}
            </select>
          </label>

          <label>
            To account ID
            <input
              name="toAccount"
              className="mono"
              placeholder="24-character account ID"
              value={form.toAccount}
              onChange={onChange}
              required
              pattern="[a-fA-F0-9]{24}"
              title="A 24-character hexadecimal account ID"
            />
            {ownOthers.length > 0 && (
              <span className="chips">
                <span className="hint">Your accounts:</span>
                {ownOthers.map((a) => (
                  <button
                    type="button"
                    key={a._id}
                    className="chip"
                    onClick={() => onChange({ target: { name: "toAccount", value: a._id } })}
                  >
                    …{a._id.slice(-8)}
                  </button>
                ))}
              </span>
            )}
          </label>

          <label>
            Amount (₹)
            <input
              name="amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              className="num amount-input"
              value={form.amount}
              onChange={onChange}
              required
            />
            {fromBalance != null && <span className="hint">Available: {formatINR(fromBalance)}</span>}
          </label>

          <button className="btn btn-primary btn-block" disabled={busy || loading}>
            {busy ? "Sending…" : "Send money"}
          </button>
          <p className="hint key">Idempotency key <code>{idempotencyKey}</code></p>
        </form>

        <aside>
          {result ? (
            <Receipt result={result} />
          ) : (
            <div className="card note">
              <h3>How this works</h3>
              <ol>
                <li>Your balance is summed from ledger entries, inside a database transaction.</li>
                <li>A <b>DEBIT</b> is written on your account and a matching <b>CREDIT</b> on the receiver's.</li>
                <li>If anything fails, both are rolled back together.</li>
                <li>Pressing Send again after an error reuses the same key, so money never moves twice.</li>
              </ol>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
