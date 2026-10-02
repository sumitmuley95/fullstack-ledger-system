import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { authApi } from "./api"

// The JWT lives in an httpOnly cookie that JavaScript can't read, and the
// backend has no "who am I" endpoint. So we remember the user object returned
// by login/register in localStorage, and drop it whenever the API says 401.
const AuthContext = createContext(null)
const STORAGE_KEY = "ledger.user"

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)

  const saveUser = useCallback((u) => {
    setUser(u)
    try {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* storage unavailable: keep in memory only */
    }
  }, [])

  useEffect(() => {
    const onExpired = () => saveUser(null)
    window.addEventListener("auth:expired", onExpired)
    return () => window.removeEventListener("auth:expired", onExpired)
  }, [saveUser])

  const login = async (email, password) => {
    const data = await authApi.login(email, password)
    saveUser(data.user)
  }

  const register = async (name, email, password) => {
    const data = await authApi.register(name, email, password)
    saveUser(data.user)
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } finally {
      saveUser(null)
    }
  }

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
