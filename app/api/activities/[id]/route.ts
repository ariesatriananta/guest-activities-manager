import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { bool, dbExecute, dbQuery } from "@/lib/db"
import { z } from "zod"

function mapActivity(row: any) {
  return row ? { ...row, isActive: bool(row.isActive) } : row
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  duration: z.number().int().min(1).optional(),
  maxCapacity: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  const { name, categoryId, description, duration, maxCapacity, isActive } = parsed.data
  await dbExecute(
    `
    UPDATE activities
    SET name = COALESCE(?, name),
        category_id = COALESCE(?, category_id),
        description = COALESCE(?, description),
        duration = COALESCE(?, duration),
        max_capacity = COALESCE(?, max_capacity),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `,
    [name ?? null, categoryId ?? null, description ?? null, duration ?? null, maxCapacity ?? null, isActive ?? null, id],
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
  return NextResponse.json(mapActivity(rows[0]))
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const usage = await dbQuery<{ has_booking: boolean }[]>(
    "SELECT EXISTS (SELECT 1 FROM bookings WHERE activity_id = ? LIMIT 1) as has_booking",
    [id],
  )
  const hasBooking = bool(usage[0]?.has_booking)
  if (hasBooking) {
    await dbExecute(
      `
      UPDATE activities
      SET is_active = 0
      WHERE id = ?
    `,
      [id],
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
    return NextResponse.json({ ...mapActivity(rows[0]), deleteMode: "soft" })
  }

  const deleted = await dbQuery(
    `
    SELECT id, category_id as categoryId, name, is_active as isActive, description, duration, max_capacity as maxCapacity, created_at, updated_at
    FROM activities
    WHERE id = ?
    LIMIT 1
  `,
    [id],
  )
  await dbExecute("DELETE FROM activities WHERE id = ?", [id])
  return NextResponse.json({ ...mapActivity(deleted[0]), deleteMode: "hard" })
}
