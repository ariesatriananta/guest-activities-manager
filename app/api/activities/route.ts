import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { bool, dbExecute, dbQuery } from "@/lib/db"
import { randomUUID } from "crypto"
import { z } from "zod"

function mapActivity(row: any) {
  return { ...row, isActive: bool(row.isActive) }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get("categoryId")
  if (categoryId) {
    const rows = await dbQuery(
      `
      SELECT id, category_id as categoryId, name, is_active as isActive, description, duration, max_capacity as maxCapacity, created_at, updated_at
      FROM activities
      WHERE category_id = ? AND is_active = 1
      ORDER BY created_at DESC
    `,
      [categoryId],
    )
    return NextResponse.json(rows.map(mapActivity))
  }
  const rows = await dbQuery(`
    SELECT id, category_id as categoryId, name, is_active as isActive, description, duration, max_capacity as maxCapacity, created_at, updated_at
    FROM activities
    ORDER BY created_at DESC
  `)
  return NextResponse.json(rows.map(mapActivity))
}

const createSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().min(1),
  description: z.string().optional(),
  duration: z.number().int().min(1),
  maxCapacity: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  const { name, categoryId, description, duration, maxCapacity, isActive } = parsed.data
  const id = randomUUID()
  await dbExecute(
    `
    INSERT INTO activities (id, category_id, name, is_active, description, duration, max_capacity)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
    [id, categoryId, name, isActive ?? true, description ?? null, duration, maxCapacity ?? null],
  )
  const rows = await dbQuery(
    `
    SELECT id, category_id as categoryId, name, is_active as isActive, description, duration, max_capacity as maxCapacity, created_at, updated_at
    FROM activities
    WHERE id = ?
    LIMIT 1
  `,
    [id],
  )
  return NextResponse.json(mapActivity(rows[0]), { status: 201 })
}
