import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  duration: z.number().int().min(1).optional(),
  maxCapacity: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = params.id
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  const { name, categoryId, description, duration, maxCapacity, isActive } = parsed.data
  const rows = await sql`
    UPDATE activities
    SET name = COALESCE(${name ?? null}, name),
        category_id = COALESCE(${categoryId ?? null}, category_id),
        description = COALESCE(${description ?? null}, description),
        duration = COALESCE(${duration ?? null}, duration),
        max_capacity = COALESCE(${maxCapacity ?? null}, max_capacity),
        is_active = COALESCE(${isActive ?? null}, is_active),
        updated_at = now()
    WHERE id = ${id}
    RETURNING id, category_id as "categoryId", name, is_active as "isActive", description, duration, max_capacity as "maxCapacity", created_at, updated_at
  `
  return NextResponse.json(rows[0])
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = params.id
  await sql`DELETE FROM activities WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}

