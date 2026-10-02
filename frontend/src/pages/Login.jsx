import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../AuthContext"
import AuthCard from "../components/AuthCard"
import Alert from "../components/Alert"

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setBusy(true)
    try {
      await login(form.email.trim(), form.password)
      navigate("/")
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to see your accounts."
      footer={<>New here? <Link to="/register">Create an account</Link></>}
    >
      <form onSubmit={onSubmit} className="form">
        <Alert>{error}</Alert>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required value={form.email} onChange={onChange} />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required value={form.password} onChange={onChange} />
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
      </form>
    </AuthCard>
  )
}
