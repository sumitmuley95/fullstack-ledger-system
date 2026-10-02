import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { accountApi, formatINR } from "../api"
import { useAuth } from "../AuthContext"
import Alert from "../components/Alert"
import CopyId from "../components/CopyId"

export default function Dashboard() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setError("")
    setLoading(true)
    try {
      // Each account already includes its balance, computed in one query on the server
      const { accounts } = await accountApi.list()
      setAccounts(accounts)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createAccount = async () => {
    setCreating(true)
    setError("")
    try {
      await accountApi.create()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const total = accounts.reduce((sum, a) => sum + a.balance, 0)

  return (
    <>
      <section className="page-head">
        <div>
          <p className="eyebrow">Hello, {user.name.split(" ")[0]}</p>
          <h1>Your accounts</h1>
        </div>
        <div className="head-actions">
          <button className="btn btn-ghost" onClick={load} disabled={loading}>Refresh</button>
          <button className="btn btn-primary" onClick={createAccount} disabled={creating}>
            {creating ? "Opening…" : "+ New account"}
          </button>
        </div>
      </section>

      <Alert>{error}</Alert>

      {!loading && accounts.length > 0 && (
        <div className="summary">
          <span className="muted">Total across {accounts.length} account{accounts.length > 1 ? "s" : ""}</span>
          <span className="summary-amount num">{formatINR(total)}</span>
        </div>
      )}

      {loading ? (
        <div className="grid">
          {[0, 1].map((i) => <div key={i} className="card account skeleton" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="card empty">
          <h2>No accounts yet</h2>
          <p className="muted">Open your first account to receive and send money.</p>
          <button className="btn btn-primary" onClick={createAccount} disabled={creating}>Open an account</button>
        </div>
      ) : (
        <div className="grid">
          {accounts.map((a) => (
            <article key={a._id} className="card account">
              <div className="account-top">
                <span className={`badge badge-${a.status.toLowerCase()}`}>{a.status}</span>
                <span className="muted small">{a.currency}</span>
              </div>
              <div className="account-balance num">{formatINR(a.balance)}</div>
              <CopyId id={a._id} />
              <div className="account-foot">
                <span className="muted small">Opened {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                {a.status === "ACTIVE" && (
                  <Link className="btn btn-ghost btn-sm" to={`/transfer?from=${a._id}`}>Send →</Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}