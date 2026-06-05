import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { bool, dbQuery } from "@/lib/db"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { date, venueId, excludeBookingId, startTime, endTime } = await req.json()
  const venues = await dbQuery<{ is_single_booking_per_day: number; is_exclusive_by_time: number; name: string }[]>(
    "SELECT is_single_booking_per_day, is_exclusive_by_time, name FROM venues WHERE id = ? LIMIT 1",
    [venueId],
  )
  const venue = venues[0]

  if (venue && bool(venue.is_single_booking_per_day)) {
    const conflicts = await dbQuery<{ id: string }[]>(
      `
      SELECT id FROM bookings
      WHERE date = ?
        AND venue_id = ?
        AND status IN ('confirmed','done','tentative')
        AND (? IS NULL OR id <> ?)
      ORDER BY CASE WHEN status = 'tentative' THEN 1 ELSE 0 END, created_at ASC
      LIMIT 1
    `,
      [date, venueId, excludeBookingId ?? null, excludeBookingId ?? null],
    )
    if (conflicts.length > 0) {
      const detail = await dbQuery<{ guest_name: string; activity_name: string; status: string }[]>(
        `
        SELECT b.guest_name, a.name as activity_name, b.status
        FROM bookings b
        JOIN activities a ON a.id = b.activity_id
        WHERE b.id = ?
        LIMIT 1
      `,
        [conflicts[0].id],
      )
      return NextResponse.json({
        hasConflict: true,
        venueName: venue.name,
        guestName: detail[0]?.guest_name,
        activityName: detail[0]?.activity_name,
        status: detail[0]?.status,
        policy: "per_day_single",
      })
    }
    return NextResponse.json({ hasConflict: false })
  }

  if (venue && bool(venue.is_exclusive_by_time) && startTime && endTime) {
    const overlaps = await dbQuery<{ id: string }[]>(
      `
      SELECT id FROM bookings
      WHERE date = ?
        AND venue_id = ?
        AND status IN ('confirmed','done','tentative')
        AND (? IS NULL OR id <> ?)
        AND NOT (? <= start_time OR ? >= COALESCE(end_time, start_time))
      ORDER BY CASE WHEN status = 'tentative' THEN 1 ELSE 0 END, created_at ASC
      LIMIT 1
    `,
      [date, venueId, excludeBookingId ?? null, excludeBookingId ?? null, endTime, startTime],
    )
    if (overlaps.length > 0) {
      const detail = await dbQuery<{ guest_name: string; activity_name: string; status: string }[]>(
        `
        SELECT b.guest_name, a.name as activity_name, b.status
        FROM bookings b
        JOIN activities a ON a.id = b.activity_id
        WHERE b.id = ?
        LIMIT 1
      `,
        [overlaps[0].id],
      )
      return NextResponse.json({
        hasConflict: true,
        venueName: venue.name,
        guestName: detail[0]?.guest_name,
        activityName: detail[0]?.activity_name,
        status: detail[0]?.status,
        policy: "exclusive_time",
      })
    }
  }

  return NextResponse.json({ hasConflict: false })
}
