import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbExecute, dbQuery } from "@/lib/db"
import { randomUUID } from "crypto"
import { z } from "zod"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const rows = await dbQuery(`
    SELECT id, name, description, created_at, updated_at
    FROM activity_categories
    ORDER BY created_at DESC
  `)
  return NextResponse.json(rows)
}

const createSchema = z.object({ name: z.string().min(1), description: z.string().optional() })

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  const { name, description } = parsed.data
  const id = randomUUID()
  await dbExecute(
    `
    INSERT INTO activity_categories (id, name, description)
    VALUES (?, ?, ?)
  `,
    [id, name, description ?? null],
  )
  const rows = await dbQuery(
    `
    SELECT id, name, description, created_at, updated_at
    FROM activity_categories
    WHERE id = ?
    LIMIT 1
  `,
    [id],
  )
  return NextResponse.json(rows[0], { status: 201 })
}
