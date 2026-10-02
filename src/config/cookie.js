const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

// The frontend and API share one origin (Express serves the React build, and
// Vite proxies /api in dev), so a strict same-site cookie works everywhere.
const baseCookieOptions = {
    httpOnly: true,                                  // JS can't read the token, limiting damage from XSS
    secure: process.env.NODE_ENV === "production",   // HTTPS-only in production
    sameSite: "strict",                              // never sent on cross-site requests, blocking CSRF
}

module.exports = {
    setCookieOptions: { ...baseCookieOptions, maxAge: THREE_DAYS_MS }, // matches the JWT's 3d expiry
    clearCookieOptions: baseCookieOptions,
}