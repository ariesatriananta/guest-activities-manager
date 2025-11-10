import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

function toMinutes(t: string) {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10) || 0)
  return h * 60 + m
}
function toHHMM(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const venueId = searchParams.get("venueId")
  const date = searchParams.get("date")
  const open = searchParams.get("open") || "06:00"
  const close = searchParams.get("close") || "23:00"
  const slot = Math.max(5, Math.min(180, parseInt(searchParams.get("slot") || "30", 10) || 30))

  if (!venueId || !date) {
    return NextResponse.json({ error: "Missing venueId or date" }, { status: 400 })
  }

  // Load bookings for the day/venue
  const rows = await sql<{
    startTime: string
    endTime: string | null
    guestName: string
    activityName: string
  }[]>`
    SELECT to_char(b.start_time, 'HH24:MI') as "startTime",
           to_char(b.end_time,   'HH24:MI') as "endTime",
           b.guest_name          as "guestName",
           a.name                as "activityName"
    FROM bookings b
    JOIN activities a ON a.id = b.activity_id
    WHERE b.date = ${date}::date
      AND b.venue_id = ${venueId}::uuid
      AND b.status <> 'cancelled'
    ORDER BY b.start_time ASC
  `

  const usedIntervals = rows.map((r) => ({
    start: r.startTime,
    end: r.endTime || r.startTime,
    guestName: r.guestName,
    activityName: r.activityName,
  }))

  // Merge overlaps
  const used = usedIntervals
    .map((x) => ({ ...x, s: toMinutes(x.start), e: toMinutes(x.end) }))
    .sort((a, b) => a.s - b.s)

  const merged: { s: number; e: number; start: string; end: string; guestName?: string; activityName?: string }[] = []
  for (const u of used) {
    if (!merged.length) {
      merged.push({ s: Math.min(u.s, u.e), e: Math.max(u.s, u.e), start: u.start, end: u.end, guestName: u.guestName, activityName: u.activityName })
      continue
    }
    const last = merged[merged.length - 1]
    if (u.s <= last.e) {
      last.e = Math.max(last.e, u.e)
      last.end = toHHMM(last.e)
    } else {
      merged.push({ s: Math.min(u.s, u.e), e: Math.max(u.s, u.e), start: u.start, end: u.end, guestName: u.guestName, activityName: u.activityName })
    }
  }

  // Compute free gaps between [open, close)
  const dayStart = toMinutes(open)
  const dayEnd = toMinutes(close)
  const free: { start: string; end: string }[] = []
  let cursor = dayStart
  for (const m of merged) {
    if (m.s > cursor) free.push({ start: toHHMM(cursor), end: toHHMM(Math.min(m.s, dayEnd)) })
    cursor = Math.max(cursor, m.e)
    if (cursor >= dayEnd) break
  }
  if (cursor < dayEnd) free.push({ start: toHHMM(cursor), end: toHHMM(dayEnd) })

  // Optionally split free into slots of 'slot' minutes
  const freeSlots: { start: string; end: string }[] = []
  for (const g of free) {
    let cs = toMinutes(g.start)
    const ce = toMinutes(g.end)
    while (cs + slot <= ce) {
      freeSlots.push({ start: toHHMM(cs), end: toHHMM(cs + slot) })
      cs += slot
    }
  }

  return NextResponse.json({ venueId, date, slot, used: merged.map(({ start, end, guestName, activityName }) => ({ start, end, guestName, activityName })), free, freeSlots })
}

