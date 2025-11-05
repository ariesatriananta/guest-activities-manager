import { neon } from "@neondatabase/serverless"

// Neon serverless SQL client
// Requires env: DATABASE_URL
export const sql = (() => {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("Missing env: DATABASE_URL")
  }
  return neon(url)
})()

export type ProfileRow = {
  id: string
  email: string
  password_hash: string
  name: string
  role: "admin" | "staff"
  avatar_img: string | null
  created_at: string
  updated_at: string
}

