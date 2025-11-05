import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { date, venueId, excludeBookingId } = await req.json()
  const venues = await sql<{ is_single_booking_per_day: boolean; name: string }[]>`
    SELECT is_single_booking_per_day, name FROM venues WHERE id = ${venueId} LIMIT 1
  `
  const v = venues[0]
  if (!v?.is_single_booking_per_day) return NextResponse.json({ hasConflict: false })
  const conflicts = await sql`SELECT 1 FROM bookings WHERE date = ${date} AND venue_id = ${venueId} AND status <> 'cancelled' AND (${excludeBookingId ?? null} IS NULL OR id <> ${excludeBookingId}) LIMIT 1`
  if (conflicts.length > 0) return NextResponse.json({ hasConflict: true, venueName: v.name })
  return NextResponse.json({ hasConflict: false })
}

