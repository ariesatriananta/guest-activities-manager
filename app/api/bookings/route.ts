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
           b.created_at as "createdAt",
           b.updated_at as "updatedAt",
           b.created_by as "createdById",
           b.updated_by as "updatedById",
           creator.name as "createdByName",
           updater.name as "updatedByName"
    FROM bookings b
    LEFT JOIN activities a ON a.id = b.activity_id
    LEFT JOIN profiles creator ON creator.id = b.created_by
    LEFT JOIN profiles updater ON updater.id = b.updated_by
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
    remark,
    status,
  } = body || {}

  // Conflict check for single-booking-per-day venues
  const venues = await sql<{ is_single_booking_per_day: boolean; is_exclusive_by_time: boolean; name: string }[]>`
    SELECT is_single_booking_per_day, is_exclusive_by_time, name FROM venues WHERE id = ${venueId} LIMIT 1
  `
  const v = venues[0]
  if (v?.is_single_booking_per_day) {
    const conflicts = await sql`SELECT 1 FROM bookings WHERE date = ${date} AND venue_id = ${venueId} AND status = 'confirmed' LIMIT 1`
    if (conflicts.length > 0) {
      return NextResponse.json({ error: `Venue ${v.name} already has a booking on ${date}` }, { status: 400 })
    }
  }
  if (v?.is_exclusive_by_time) {
    if (!endTime || typeof endTime !== 'string' || !endTime.trim()) {
      return NextResponse.json({ error: `End time is required for venue ${v.name}` }, { status: 400 })
    }
    const overlaps = await sql`SELECT 1 FROM bookings
      WHERE date = ${date}::date AND venue_id = ${venueId}::uuid AND status = 'confirmed'
        AND NOT ( ${endTime}::time <= start_time OR ${startTime}::time >= COALESCE(end_time, start_time) )
      LIMIT 1`
    if (overlaps.length > 0) {
      return NextResponse.json({ error: `Time slot overlaps with existing booking at ${v.name}` }, { status: 400 })
    }
  }

  const endTimeParam = endTime && typeof endTime === 'string' && endTime.trim() ? endTime : null
  const rows = await sql<any[]>`
    WITH inserted AS (
      INSERT INTO bookings (
        date, start_time, end_time, activity_id, venue_id, guest_name, suite_number, pax, ga_name, driver_name, remark, status, created_by, updated_by
      ) VALUES (
        ${date}, ${startTime}::time, ${endTimeParam}::time, ${activityId}, ${venueId}, ${guestName}, ${suiteNumber}, ${pax}, ${gaName || null}, ${driverName || null}, ${remark || null}, ${status}, ${userId}, ${userId}
      )
      RETURNING *
    )
    SELECT inserted.id,
      to_char(inserted.date, 'YYYY-MM-DD') as date,
      to_char(inserted.start_time, 'HH24:MI') as "startTime",
      to_char(inserted.end_time, 'HH24:MI') as "endTime",
      inserted.activity_id as "activityId",
      inserted.venue_id as "venueId",
      inserted.guest_name as "guestName",
      inserted.suite_number as "suiteNumber",
      inserted.pax,
      inserted.ga_name as "gaName",
      inserted.driver_name as "driverName",
      inserted.remark,
      inserted.status,
      inserted.created_at as "createdAt",
      inserted.updated_at as "updatedAt",
      inserted.created_by as "createdById",
      inserted.updated_by as "updatedById",
      creator.name as "createdByName",
      updater.name as "updatedByName"
    FROM inserted
    LEFT JOIN profiles creator ON creator.id = inserted.created_by
    LEFT JOIN profiles updater ON updater.id = inserted.updated_by
  `
  const createdBooking = rows[0]
  if (createdBooking) {
    await sql`
      INSERT INTO booking_history (booking_id, actor_id, action)
      VALUES (${createdBooking.id}, ${userId}, 'created')
    `
  }
  return NextResponse.json(createdBooking, { status: 201 })
}
