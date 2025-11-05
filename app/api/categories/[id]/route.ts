import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

const updateSchema = z.object({ name: z.string().min(1).optional(), description: z.string().optional() })

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  const { name, description } = parsed.data
  const rows = await sql`
    UPDATE activity_categories
    SET name = COALESCE(${name ?? null}, name),
        description = COALESCE(${description ?? null}, description),
        updated_at = now()
    WHERE id = ${id}
    RETURNING id, name, description, created_at, updated_at
  `
  return NextResponse.json(rows[0])
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    await sql`DELETE FROM activity_categories WHERE id = ${id}`
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
