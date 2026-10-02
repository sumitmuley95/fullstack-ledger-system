import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../AuthContext"
import AuthCard from "../components/AuthCard"
import Alert from "../components/Alert"

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setBusy(true)
    try {
      await register(form.name.trim(), form.email.trim(), form.password)
      navigate("/")
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard
      title="Open your ledger"
      subtitle="Create a user, then open one or more accounts."
      footer={<>Already registered? <Link to="/login">Log in</Link></>}
    >
      <form onSubmit={onSubmit} className="form">
        <Alert>{error}</Alert>
        <label>
          Full name
          <input name="name" autoComplete="name" required value={form.name} onChange={onChange} />
        </label>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required value={form.email} onChange={onChange} />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="new-password" required minLength={6} value={form.password} onChange={onChange} />
          <span className="hint">At least 6 characters.</span>
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
      </form>
    </AuthCard>
  )
}
