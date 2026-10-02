import { Navigate, Route, Routes } from "react-router-dom"
import { useAuth } from "./AuthContext"
import Layout from "./components/Layout"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"
import Transfer from "./pages/Transfer"
import SystemFunds from "./pages/SystemFunds"

// Logged-in users only. While /auth/me is loading we don't know yet, so wait.
function Protected({ children }) {
  const { user, checking } = useAuth()
  if (checking) return <div className="page muted">Loading…</div>
  return user ? children : <Navigate to="/login" replace />
}

// Logged-out users only (login / register pages)
function GuestOnly({ children }) {
  const { user, checking } = useAuth()
  if (checking) return null
  return user ? <Navigate to="/" replace /> : children
}

// System users only
function SystemOnly({ children }) {
  const { user } = useAuth()
  return user?.systemUser ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transfer" element={<Transfer />} />
        <Route path="/system" element={<SystemOnly><SystemFunds /></SystemOnly>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}