import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const rows = await sql`
    SELECT id, name, description, created_at, updated_at
    FROM activity_categories
    ORDER BY created_at DESC
  `
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
  const rows = await sql`
    INSERT INTO activity_categories (name, description)
    VALUES (${name}, ${description ?? null})
    RETURNING id, name, description, created_at, updated_at
  `
  return NextResponse.json(rows[0], { status: 201 })
}
