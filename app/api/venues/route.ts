import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const rows = await sql`
    SELECT id, name, is_single_booking_per_day as "isSingleBookingPerDay", location, capacity, created_at, updated_at
    FROM venues
    ORDER BY created_at DESC
  `
  return NextResponse.json(rows)
}

const createSchema = z.object({ name: z.string().min(1), location: z.string().optional(), capacity: z.number().int().min(1).optional(), isSingleBookingPerDay: z.boolean().optional() })

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  const { name, location, capacity, isSingleBookingPerDay } = parsed.data
  const rows = await sql`
    INSERT INTO venues (name, is_single_booking_per_day, location, capacity)
    VALUES (${name}, ${isSingleBookingPerDay ?? false}, ${location ?? null}, ${capacity ?? null})
    RETURNING id, name, is_single_booking_per_day as "isSingleBookingPerDay", location, capacity, created_at, updated_at
  `
  return NextResponse.json(rows[0], { status: 201 })
}
