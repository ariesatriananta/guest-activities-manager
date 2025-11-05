import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

function toHHmm(t: string): string {
  // t expected 'HH:MM:SS' or 'HH:MM'
  const [h, m] = t.split(":")
  return `${h.padStart(2, "0")}:${(m || "00").padStart(2, "0")}`
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const venueId = searchParams.get("venueId")
  const categoryId = searchParams.get("categoryId")
  const status = searchParams.get("status")

  const rows = await sql<any[]>`
    SELECT b.id,
           to_char(b.date, 'YYYY-MM-DD') as date,
           to_char(b.start_time, 'HH24:MI') as "startTime",
           to_char(b.end_time, 'HH24:MI') as "endTime",
           b.activity_id as "activityId",
           b.venue_id as "venueId",
           b.guest_name as "guestName",
           b.suite_number as "suiteNumber",
           b.pax,
           b.ga_name as "gaName",
           b.driver_name as "driverName",
           b.remark,
           b.status,
           b.created_at as "createdAt"
    FROM bookings b
    LEFT JOIN activities a ON a.id = b.activity_id
    WHERE (${dateFrom}::date IS NULL OR b.date >= ${dateFrom})
      AND (${dateTo}::date IS NULL OR b.date <= ${dateTo})
      AND (${venueId}::uuid IS NULL OR b.venue_id = ${venueId})
      AND (${categoryId}::uuid IS NULL OR a.category_id = ${categoryId})
      AND (${status}::text IS NULL OR b.status = ${status})
    ORDER BY b.date DESC, b.start_time DESC
  `
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
    remark,
    status,
  } = body || {}

  // Conflict check for single-booking-per-day venues
  const venues = await sql<{ is_single_booking_per_day: boolean; name: string }[]>`
    SELECT is_single_booking_per_day, name FROM venues WHERE id = ${venueId} LIMIT 1
  `
  const v = venues[0]
  if (v?.is_single_booking_per_day) {
    const conflicts = await sql`SELECT 1 FROM bookings WHERE date = ${date} AND venue_id = ${venueId} AND status <> 'cancelled' LIMIT 1`
    if (conflicts.length > 0) {
      return NextResponse.json({ error: `Venue ${v.name} already has a booking on ${date}` }, { status: 400 })
    }
  }

  const endTimeParam = endTime && typeof endTime === 'string' && endTime.trim() ? endTime : null
  const rows = await sql<any[]>`
    INSERT INTO bookings (
      date, start_time, end_time, activity_id, venue_id, guest_name, suite_number, pax, ga_name, driver_name, remark, status
    ) VALUES (
      ${date}, ${startTime}::time, ${endTimeParam}::time, ${activityId}, ${venueId}, ${guestName}, ${suiteNumber}, ${pax}, ${gaName || null}, ${driverName || null}, ${remark || null}, ${status}
    )
    RETURNING id,
      to_char(date, 'YYYY-MM-DD') as date,
      to_char(start_time, 'HH24:MI') as "startTime",
      to_char(end_time, 'HH24:MI') as "endTime",
      activity_id as "activityId",
      venue_id as "venueId",
      guest_name as "guestName",
      suite_number as "suiteNumber",
      pax,
      ga_name as "gaName",
      driver_name as "driverName",
      remark,
      status,
      created_at as "createdAt"
  `
  return NextResponse.json(rows[0], { status: 201 })
}
