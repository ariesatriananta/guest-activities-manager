import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const rows = await sql<any[]>`
    SELECT h.id,
           h.booking_id,
           h.action,
           h.changes,
           h.created_at,
           p.name as actor_name
    FROM booking_history h
    LEFT JOIN profiles p ON p.id = h.actor_id
    WHERE h.booking_id = ${id}
    ORDER BY h.created_at ASC
  `
  const history = rows.map((row) => ({
    id: row.id,
    bookingId: row.booking_id,
    action: row.action,
    changes: typeof row.changes === "string" ? JSON.parse(row.changes) : row.changes,
    createdAt: row.created_at,
    actorName: row.actor_name,
  }))
  return NextResponse.json(history)
}
