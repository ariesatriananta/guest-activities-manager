import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

const updateSchema = z.object({ name: z.string().min(1).optional(), location: z.string().optional(), capacity: z.number().int().min(1).optional(), isSingleBookingPerDay: z.boolean().optional() })

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  const { name, location, capacity, isSingleBookingPerDay } = parsed.data
  const rows = await sql`
    UPDATE venues
    SET name = COALESCE(${name ?? null}, name),
        location = COALESCE(${location ?? null}, location),
        capacity = COALESCE(${capacity ?? null}, capacity),
        is_single_booking_per_day = COALESCE(${isSingleBookingPerDay ?? null}, is_single_booking_per_day),
        updated_at = now()
    WHERE id = ${id}
    RETURNING id, name, is_single_booking_per_day as "isSingleBookingPerDay", location, capacity, created_at, updated_at
  `
  return NextResponse.json(rows[0])
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await sql`DELETE FROM venues WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
