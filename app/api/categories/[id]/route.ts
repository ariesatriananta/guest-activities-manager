import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbExecute, dbQuery } from "@/lib/db"
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
  await dbExecute(
    `
    UPDATE activity_categories
    SET name = COALESCE(?, name),
        description = COALESCE(?, description)
    WHERE id = ?
  `,
    [name ?? null, description ?? null, id],
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
  return NextResponse.json(rows[0])
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    await dbExecute("DELETE FROM activity_categories WHERE id = ?", [id])
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
