import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  avatar_img: z.string().url().optional().or(z.literal("")).optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(4).optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const meId = (session.user as any).id as string
  const rows = await sql`
    SELECT id, email, name, role, avatar_img, created_at, updated_at
    FROM profiles
    WHERE id = ${meId}
    LIMIT 1
  `
  const me = rows?.[0]
  return NextResponse.json(me)
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const meId = (session.user as any).id as string
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
  }
  const { name, avatar_img, currentPassword, newPassword } = parsed.data

  // If changing password, verify current password first
  if (typeof newPassword !== "undefined") {
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 })
    }
    const existing = await sql<{ password_hash: string }[]>`
      SELECT password_hash FROM profiles WHERE id = ${meId} LIMIT 1
    `
    const hash = existing?.[0]?.password_hash
    if (!hash || !(await bcrypt.compare(currentPassword, hash))) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }
  }

  const newHash = typeof newPassword !== "undefined" ? await bcrypt.hash(newPassword, 10) : null

  const rows = await sql`
    UPDATE profiles
    SET
      name = COALESCE(${name ?? null}, name),
      avatar_img = COALESCE(${avatar_img ?? null}, avatar_img),
      password_hash = COALESCE(${newHash}, password_hash),
      updated_at = now()
    WHERE id = ${meId}
    RETURNING id, email, name, role, avatar_img, created_at, updated_at
  `
  return NextResponse.json(rows[0])
}
