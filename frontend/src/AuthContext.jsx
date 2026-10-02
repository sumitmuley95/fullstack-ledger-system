import { createContext, useContext, useEffect, useState } from "react"
import { authApi } from "./api"

// The JWT lives in an httpOnly cookie that JavaScript can't read, so on load
// we ask the server who is logged in. The server is the single source of truth.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  // On first load: is there a valid session cookie?
  useEffect(() => {
    authApi.me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false))
  }, [])

  // Any API call that gets a 401 (expired token, logged out elsewhere) logs us out here too
  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener("auth:expired", onExpired)
    return () => window.removeEventListener("auth:expired", onExpired)
  }, [])

  const login = async (email, password) => {
    const data = await authApi.login(email, password)
    setUser(data.user)
  }

  const register = async (name, email, password) => {
    const data = await authApi.register(name, email, password)
    setUser(data.user)
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, checking, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}