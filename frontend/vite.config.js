import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// In development, Vite forwards every /api request to the Express server on :3000.
// The browser then sees one origin, so the httpOnly "token" cookie just works.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000"
    }
  }
})
