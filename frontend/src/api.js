// Thin wrapper around fetch for the Express API.
// VITE_API_URL is optional: leave it empty in dev (Vite proxy) and when the
// backend serves the built frontend. Set it only if the API lives elsewhere.
const BASE = (import.meta.env.VITE_API_URL || "") + "/api"

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export async function api(path, { method = "GET", body } = {}) {
  let res
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: "include", // send the httpOnly token cookie
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError("Can't reach the server. Is the backend running on port 3000?", 0)
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    // non-JSON response (e.g. empty body)
  }

  if (!res.ok) {
    // Session expired / logged out elsewhere -> let the app know
    if (res.status === 401 && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event("auth:expired"))
    }
    throw new ApiError(data?.message || `Request failed (${res.status})`, res.status)
  }
  return data
}

// One helper per backend endpoint, so pages never hard-code URLs.
export const authApi = {
  register: (name, email, password) => api("/auth/register", { method: "POST", body: { name, email, password } }),
  login: (email, password) => api("/auth/login", { method: "POST", body: { email, password } }),
  logout: () => api("/auth/logout", { method: "POST" }),
}

export const accountApi = {
  list: () => api("/accounts"),
  create: () => api("/accounts", { method: "POST" }),
  balance: (accountId) => api(`/accounts/balance/${accountId}`),
}

export const transactionApi = {
  transfer: (payload) => api("/transactions", { method: "POST", body: payload }),
  initialFunds: (payload) => api("/transactions/system/initial-funds", { method: "POST", body: payload }),
}

export function newIdempotencyKey() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function formatINR(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(value ?? 0)
}
