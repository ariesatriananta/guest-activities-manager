import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const rows = await sql<{ has_booking: boolean }[]>`
    SELECT EXISTS (SELECT 1 FROM bookings WHERE activity_id = ${id} LIMIT 1) as has_booking
  `
  return NextResponse.json({ hasBooking: rows[0]?.has_booking === true })
}
