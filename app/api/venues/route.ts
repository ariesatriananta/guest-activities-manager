import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { bool, dbExecute, dbQuery } from "@/lib/db"
import { randomUUID } from "crypto"
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

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const rows = await dbQuery(`
    SELECT id, name, is_single_booking_per_day as isSingleBookingPerDay, is_exclusive_by_time as isExclusiveByTime, location, capacity, created_at, updated_at
    FROM venues
    ORDER BY created_at DESC
  `)
  return NextResponse.json(rows.map(mapVenue))
}

const createSchema = z.object({ name: z.string().min(1), location: z.string().optional(), capacity: z.number().int().min(1).optional(), isSingleBookingPerDay: z.boolean().optional(), isExclusiveByTime: z.boolean().optional() })

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  const { name, location, capacity, isSingleBookingPerDay, isExclusiveByTime } = parsed.data
  const id = randomUUID()
  await dbExecute(
    `
    INSERT INTO venues (id, name, is_single_booking_per_day, is_exclusive_by_time, location, capacity)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    [id, name, isSingleBookingPerDay ?? false, isExclusiveByTime ?? false, location ?? null, capacity ?? null],
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
  return NextResponse.json(mapVenue(rows[0]), { status: 201 })
}
