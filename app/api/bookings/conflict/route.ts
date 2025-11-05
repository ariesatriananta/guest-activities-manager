import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { date, venueId, excludeBookingId } = await req.json()
  const venues = await sql<{ is_single_booking_per_day: boolean; name: string }[]>`
    SELECT is_single_booking_per_day, name FROM venues WHERE id = ${venueId}::uuid LIMIT 1
  `
  const v = venues[0]
  if (!v?.is_single_booking_per_day) return NextResponse.json({ hasConflict: false })
  const conflicts = await sql<{ id: string }[]>`
    SELECT id FROM bookings
    WHERE date = ${date}::date
      AND venue_id = ${venueId}::uuid
      AND status <> 'cancelled'
      AND ((${excludeBookingId ?? null}::uuid) IS NULL OR id <> ${excludeBookingId ?? null}::uuid)
    ORDER BY created_at ASC
    LIMIT 1
  `
  if (conflicts.length > 0) {
    const detail = await sql<{ guest_name: string; activity_name: string }[]>`
      SELECT b.guest_name, a.name as activity_name
      FROM bookings b
      JOIN activities a ON a.id = b.activity_id
      WHERE b.id = ${conflicts[0].id}
      LIMIT 1
    `
    return NextResponse.json({
      hasConflict: true,
      venueName: v.name,
      guestName: detail[0]?.guest_name,
      activityName: detail[0]?.activity_name,
    })
  }
  return NextResponse.json({ hasConflict: false })
}
