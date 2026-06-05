import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { bool, dbExecute, dbQuery } from "@/lib/db"
import { randomUUID } from "crypto"

const bookingSelect = `
  SELECT b.id,
         DATE_FORMAT(b.date, '%Y-%m-%d') as date,
         TIME_FORMAT(b.start_time, '%H:%i') as startTime,
         TIME_FORMAT(b.end_time, '%H:%i') as endTime,
         b.activity_id as activityId,
         b.venue_id as venueId,
         b.guest_name as guestName,
         b.suite_number as suiteNumber,
         b.pax,
         b.ga_name as gaName,
         b.driver_name as driverName,
         b.bill,
         b.remark,
         b.status,
         b.created_at as createdAt,
         b.updated_at as updatedAt,
         b.created_by as createdById,
         b.updated_by as updatedById,
         creator.name as createdByName,
         updater.name as updatedByName
  FROM bookings b
  LEFT JOIN activities a ON a.id = b.activity_id
  LEFT JOIN profiles creator ON creator.id = b.created_by
  LEFT JOIN profiles updater ON updater.id = b.updated_by
`

async function getBookingById(id: string) {
  const rows = await dbQuery(`${bookingSelect} WHERE b.id = ? LIMIT 1`, [id])
  return rows[0] || null
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const params: unknown[] = []
  const conditions: string[] = []
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const venueId = searchParams.get("venueId")
  const categoryId = searchParams.get("categoryId")
  const status = searchParams.get("status")

  if (dateFrom) {
    conditions.push("b.date >= ?")
    params.push(dateFrom)
  }
  if (dateTo) {
    conditions.push("b.date <= ?")
    params.push(dateTo)
  }
  if (venueId) {
    conditions.push("b.venue_id = ?")
    params.push(venueId)
  }
  if (categoryId) {
    conditions.push("a.category_id = ?")
    params.push(categoryId)
  }
  if (status) {
    conditions.push("b.status = ?")
    params.push(status)
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""
  const rows = await dbQuery(`${bookingSelect} ${where} ORDER BY b.date DESC, b.start_time DESC`, params)
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (session.user as any)?.role as string | undefined
  if (role === "viewer") return NextResponse.json({ error: "Anda tidak diijinkan membuat booking" }, { status: 403 })
  const userId = (session.user as any)?.id ?? null
  const body = await req.json()
  const {
    date,
    startTime,
    endTime,
    activityId,
    venueId,
    guestName,
    suiteNumber,
    pax,
    gaName,
    driverName,
    bill,
    remark,
    status,
    allowTentativeOverride,
  } = body || {}

  const venues = await dbQuery<{ is_single_booking_per_day: number; is_exclusive_by_time: number; name: string }[]>(
    "SELECT is_single_booking_per_day, is_exclusive_by_time, name FROM venues WHERE id = ? LIMIT 1",
    [venueId],
  )
  const venue = venues[0]
  const allowOverride = allowTentativeOverride === true

  if (venue && bool(venue.is_single_booking_per_day) && !allowOverride) {
    const conflicts = await dbQuery(
      "SELECT 1 FROM bookings WHERE date = ? AND venue_id = ? AND status IN ('confirmed','done') LIMIT 1",
      [date, venueId],
    )
    if (conflicts.length > 0) {
      return NextResponse.json({ error: `Venue ${venue.name} already has a booking on ${date}` }, { status: 400 })
    }
  }

  if (venue && bool(venue.is_exclusive_by_time) && !allowOverride) {
    if (!endTime || typeof endTime !== "string" || !endTime.trim()) {
      return NextResponse.json({ error: `End time is required for venue ${venue.name}` }, { status: 400 })
    }
    const overlaps = await dbQuery(
      `
      SELECT 1 FROM bookings
      WHERE date = ? AND venue_id = ? AND status IN ('confirmed','done')
        AND NOT (? <= start_time OR ? >= COALESCE(end_time, start_time))
      LIMIT 1
    `,
      [date, venueId, endTime, startTime],
    )
    if (overlaps.length > 0) {
      return NextResponse.json({ error: `Time slot overlaps with existing booking at ${venue.name}` }, { status: 400 })
    }
  }

  const id = randomUUID()
  const endTimeParam = endTime && typeof endTime === "string" && endTime.trim() ? endTime : null
  await dbExecute(
    `
    INSERT INTO bookings (
      id, date, start_time, end_time, activity_id, venue_id, guest_name, suite_number,
      pax, ga_name, driver_name, bill, remark, status, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      id,
      date,
      startTime,
      endTimeParam,
      activityId,
      venueId,
      guestName,
      suiteNumber,
      pax,
      gaName || null,
      driverName || null,
      bill || null,
      remark || null,
      status,
      userId,
      userId,
    ],
  )

  const createdBooking = await getBookingById(id)
  if (createdBooking) {
    await dbExecute("INSERT INTO booking_history (id, booking_id, actor_id, action) VALUES (?, ?, ?, 'created')", [
      randomUUID(),
      createdBooking.id,
      userId,
    ])
  }
  return NextResponse.json(createdBooking, { status: 201 })
}
