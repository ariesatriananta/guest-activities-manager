import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { bool, dbExecute, dbQuery } from "@/lib/db"
import { z } from "zod"

function mapVenue(row: any) {
  return row
    ? {
        ...row,
        isSingleBookingPerDay: bool(row.isSingleBookingPerDay),
        isExclusiveByTime: bool(row.isExclusiveByTime),
      }
    : row
}

const updateSchema = z.object({ name: z.string().min(1).optional(), location: z.string().optional(), capacity: z.number().int().min(1).optional(), isSingleBookingPerDay: z.boolean().optional(), isExclusiveByTime: z.boolean().optional() })

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  const { name, location, capacity, isSingleBookingPerDay, isExclusiveByTime } = parsed.data
  await dbExecute(
    `
    UPDATE venues
    SET name = COALESCE(?, name),
        location = COALESCE(?, location),
        capacity = COALESCE(?, capacity),
        is_single_booking_per_day = COALESCE(?, is_single_booking_per_day),
        is_exclusive_by_time = COALESCE(?, is_exclusive_by_time)
    WHERE id = ?
  `,
    [name ?? null, location ?? null, capacity ?? null, isSingleBookingPerDay ?? null, isExclusiveByTime ?? null, id],
  )
  const rows = await dbQuery(
    `
    SELECT id, name, is_single_booking_per_day as isSingleBookingPerDay, is_exclusive_by_time as isExclusiveByTime, location, capacity, created_at, updated_at
    FROM venues
    WHERE id = ?
    LIMIT 1
  `,
    [id],
  )
  return NextResponse.json(mapVenue(rows[0]))
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await dbExecute("DELETE FROM venues WHERE id = ?", [id])
  return NextResponse.json({ ok: true })
}
