import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbExecute, dbQuery, mysqlDuplicateCode } from "@/lib/db"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import { z } from "zod"

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  name: z.string().min(1),
  role: z.enum(["admin", "staff", "viewer"]),
  avatar_img: z.string().url().optional().or(z.literal("")).optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await dbQuery(`
    SELECT id, email, name, role, avatar_img, created_at, updated_at
    FROM profiles
    ORDER BY created_at DESC
  `)
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
  }
  const { email, password, name, role, avatar_img } = parsed.data

  const password_hash = await bcrypt.hash(password, 10)
  try {
    const id = randomUUID()
    await dbExecute(
      `
      INSERT INTO profiles (id, email, password_hash, name, role, avatar_img)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [id, email.toLowerCase(), password_hash, name, role, avatar_img || null],
    )
    const rows = await dbQuery(
      `
      SELECT id, email, name, role, avatar_img, created_at, updated_at
      FROM profiles
      WHERE id = ?
      LIMIT 1
    `,
      [id],
    )
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e: any) {
    const msg = e?.message || "Failed"
    if (mysqlDuplicateCode(e)) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
