import { useState } from "react"
import { formatINR, newIdempotencyKey, transactionApi } from "../api"
import Alert from "../components/Alert"
import Receipt from "../components/Receipt"

export default function SystemFunds() {
  const [form, setForm] = useState({ toAccount: "", amount: "" })
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setIdempotencyKey(newIdempotencyKey())
    setResult(null)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setBusy(true)
    try {
      const data = await transactionApi.initialFunds({
        toAccount: form.toAccount.trim(),
        amount: Number(form.amount),
        idempotencyKey,
      })
      setResult(data)
      setForm({ toAccount: "", amount: "" })
      setIdempotencyKey(newIdempotencyKey())
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="page-head">
        <div>
          <p className="eyebrow">System user only</p>
          <h1>Issue initial funds</h1>
        </div>
      </section>

      <div className="split">
        <form className="card form" onSubmit={onSubmit}>
          {error?.status === 403 ? (
            <Alert kind="info">
              Your user isn't a system user. Only a user with <code>systemUser: true</code> (set directly in
              MongoDB) can issue funds, and that user needs an account of its own to debit.
            </Alert>
          ) : (
            <Alert>{error?.message}</Alert>
          )}
          <label>
            Credit account ID
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
          </label>
          <label>
            Amount (₹)
            <input name="amount" type="number" min="0.01" step="0.01" className="num amount-input" value={form.amount} onChange={onChange} required />
            {form.amount && <span className="hint">{formatINR(Number(form.amount))} will be debited from the system account</span>}
          </label>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Issuing…" : "Issue funds"}</button>
        </form>

        <aside>
          {result ? (
            <Receipt result={result} />
          ) : (
            <div className="card note">
              <h3>Seeding balances</h3>
              <p className="muted">
                New accounts start at ₹0. The system account is allowed to go negative, which is how money enters
                the ledger in the first place.
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
