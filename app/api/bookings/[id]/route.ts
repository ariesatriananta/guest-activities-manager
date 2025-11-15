import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
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
    LEFT JOIN profiles creator ON creator.id = b.created_by
    LEFT JOIN profiles updater ON updater.id = b.updated_by
    WHERE b.id = ${id}
    LIMIT 1
  `
  return NextResponse.json(rows[0] || null)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
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
  if (venueId && date) {
    const venues = await sql<{ is_single_booking_per_day: boolean; is_exclusive_by_time: boolean; name: string }[]>`
      SELECT is_single_booking_per_day, is_exclusive_by_time, name FROM venues WHERE id = ${venueId} LIMIT 1
    `
    const v = venues[0]
    if (v?.is_single_booking_per_day) {
      const conflicts = await sql`SELECT 1 FROM bookings WHERE date = ${date} AND venue_id = ${venueId} AND status = 'confirmed' AND id <> ${id} LIMIT 1`
      if (conflicts.length > 0) {
        return NextResponse.json({ error: `Venue ${v.name} already has a booking on ${date}` }, { status: 400 })
      }
    }
    if (v?.is_exclusive_by_time) {
      if (typeof startTime === 'string' && (!endTime || !String(endTime).trim())) {
        return NextResponse.json({ error: `End time is required for venue ${v.name}` }, { status: 400 })
      }
      const newEnd = endTime && typeof endTime === 'string' && endTime.trim() ? endTime : null
      if (newEnd) {
        const overlaps = await sql`SELECT 1 FROM bookings
          WHERE date = ${date}::date AND venue_id = ${venueId}::uuid AND status = 'confirmed' AND id <> ${id}
            AND NOT ( ${newEnd}::time <= start_time OR ${startTime ?? null}::time >= COALESCE(end_time, start_time) )
          LIMIT 1`
        if (overlaps.length > 0) {
          return NextResponse.json({ error: `Time slot overlaps with existing booking at ${v.name}` }, { status: 400 })
        }
      }
    }
  }

  const endTimeParam = endTime && typeof endTime === 'string' && endTime.trim() ? endTime : null
  const rows = await sql<any[]>`
    WITH updated AS (
      UPDATE bookings
      SET
        date = COALESCE(${date ?? null}::date, date),
        start_time = COALESCE(${startTime ?? null}::time, start_time),
        end_time = COALESCE(${endTimeParam}::time, end_time),
        activity_id = COALESCE(${activityId ?? null}::uuid, activity_id),
        venue_id = COALESCE(${venueId ?? null}::uuid, venue_id),
        guest_name = COALESCE(${guestName ?? null}, guest_name),
        suite_number = COALESCE(${suiteNumber ?? null}, suite_number),
        pax = COALESCE(${pax ?? null}::int, pax),
        ga_name = COALESCE(${gaName ?? null}, ga_name),
        driver_name = COALESCE(${driverName ?? null}, driver_name),
        remark = COALESCE(${remark ?? null}, remark),
        status = COALESCE(${status ?? null}, status),
        updated_at = now(),
        updated_by = ${userId}
      WHERE id = ${id}
      RETURNING *
    )
    SELECT updated.id,
      to_char(updated.date, 'YYYY-MM-DD') as date,
      to_char(updated.start_time, 'HH24:MI') as "startTime",
      to_char(updated.end_time, 'HH24:MI') as "endTime",
      updated.activity_id as "activityId",
      updated.venue_id as "venueId",
      updated.guest_name as "guestName",
      updated.suite_number as "suiteNumber",
      updated.pax,
      updated.ga_name as "gaName",
      updated.driver_name as "driverName",
      updated.remark,
      updated.status,
      updated.created_at as "createdAt",
      updated.updated_at as "updatedAt",
      updated.created_by as "createdById",
      updated.updated_by as "updatedById",
      creator.name as "createdByName",
      updater.name as "updatedByName"
    FROM updated
    LEFT JOIN profiles creator ON creator.id = updated.created_by
    LEFT JOIN profiles updater ON updater.id = updated.updated_by
  `
  return NextResponse.json(rows[0])
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await sql`DELETE FROM bookings WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
