import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useAuth } from "../AuthContext"

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout().catch(() => {})
    navigate("/login")
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">L</span>
          <span className="brand-name">Ledger</span>
        </div>
        <nav className="nav">
          <NavLink to="/" end>Accounts</NavLink>
          <NavLink to="/transfer">Transfer</NavLink>
          <NavLink to="/system">System</NavLink>
        </nav>
        <div className="user">
          <span className="user-name" title={user.email}>{user.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log out</button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}
