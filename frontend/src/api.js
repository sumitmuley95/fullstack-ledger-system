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
    throw new ApiError("Can't reach the server. Please try again in a moment.", 0)
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
  me: () => api("/auth/me"),
}

export const accountApi = {
  list: () => api("/accounts"), // each account includes its balance (paise)
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

// The API works in integer paise (₹1 = 100 paise) to avoid floating-point errors.
// "100.50" typed by the user -> 10050 sent to the server.
export function toPaise(rupees) {
  return Math.round(Number(rupees) * 100)
}

// 10050 from the server -> "₹100.50" on screen
export function formatINR(paise) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 })
    .format((paise ?? 0) / 100)
}