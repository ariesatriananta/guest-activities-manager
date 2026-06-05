import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { bool, dbExecute, dbQuery } from "@/lib/db"
import { randomUUID } from "crypto"

const toHHmm = (time: string) => {
  const [hours, minutes] = time.split(":")
  return `${hours.padStart(2, "0")}:${(minutes || "00").padStart(2, "0")}`
}

const bookingSelect = `
  SELECT b.id,
         DATE_FORMAT(b.date, '%Y-%m-%d') as date,
         TIME_FORMAT(b.start_time, '%H:%i') as startTime,
         TIME_FORMAT(b.end_time, '%H:%i') as endTime,
         b.activity_id as activityId,
         b.venue_id as venueId,
         b.guest_name as guestName,
         b.suite_number as suiteNumber,
         b.pax,
         b.ga_name as gaName,
         b.driver_name as driverName,
         b.bill,
         b.remark,
         b.status,
         b.created_at as createdAt,
         b.updated_at as updatedAt,
         b.created_by as createdById,
         b.updated_by as updatedById,
         creator.name as createdByName,
         updater.name as updatedByName
  FROM bookings b
  LEFT JOIN profiles creator ON creator.id = b.created_by
  LEFT JOIN profiles updater ON updater.id = b.updated_by
`

async function getBooking(id: string) {
  const rows = await dbQuery(`${bookingSelect} WHERE b.id = ? LIMIT 1`, [id])
  return rows[0] || null
}

async function getRawBooking(id: string) {
  const rows = await dbQuery<any[]>(
    `
    SELECT DATE_FORMAT(date, '%Y-%m-%d') as date,
           TIME_FORMAT(start_time, '%H:%i') as start_time,
           TIME_FORMAT(end_time, '%H:%i') as end_time,
           activity_id,
           venue_id,
           guest_name,
           suite_number,
           pax,
           ga_name,
           driver_name,
           bill,
           remark,
           status
    FROM bookings
    WHERE id = ?
    LIMIT 1
  `,
    [id],
  )
  return rows[0] || null
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  return NextResponse.json(await getBooking(id))
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (session.user as any)?.role as string | undefined
  if (role === "viewer") {
    return NextResponse.json({ error: "Anda tidak diijinkan mengubah booking" }, { status: 403 })
  }

  const { id } = await params
  const userId = (session.user as any)?.id ?? null
  const originalRaw = await getRawBooking(id)
  if (!originalRaw) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

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
    bill,
    remark,
    status,
    allowTentativeOverride,
  } = body || {}

  const allowOverride = allowTentativeOverride === true

  if (venueId && date && !allowOverride) {
    const venues = await dbQuery<{ is_single_booking_per_day: number; is_exclusive_by_time: number; name: string }[]>(
      "SELECT is_single_booking_per_day, is_exclusive_by_time, name FROM venues WHERE id = ? LIMIT 1",
      [venueId],
    )
    const venue = venues[0]
    if (venue && bool(venue.is_single_booking_per_day)) {
      const conflicts = await dbQuery(
        "SELECT 1 FROM bookings WHERE date = ? AND venue_id = ? AND status IN ('confirmed','done') AND id <> ? LIMIT 1",
        [date, venueId, id],
      )
      if (conflicts.length > 0) {
        return NextResponse.json({ error: `Venue ${venue.name} already has a booking on ${date}` }, { status: 400 })
      }
    }
    if (venue && bool(venue.is_exclusive_by_time)) {
      if (typeof startTime === "string" && (!endTime || !String(endTime).trim())) {
        return NextResponse.json({ error: `End time is required for venue ${venue.name}` }, { status: 400 })
      }
      const newEnd = endTime && typeof endTime === "string" && endTime.trim() ? endTime : null
      if (newEnd) {
        const overlaps = await dbQuery(
          `
          SELECT 1 FROM bookings
          WHERE date = ? AND venue_id = ? AND status IN ('confirmed','done') AND id <> ?
            AND NOT (? <= start_time OR ? >= COALESCE(end_time, start_time))
          LIMIT 1
        `,
          [date, venueId, id, newEnd, startTime ?? null],
        )
        if (overlaps.length > 0) {
          return NextResponse.json({ error: `Time slot overlaps with existing booking at ${venue.name}` }, { status: 400 })
        }
      }
    }
  }

  const endTimeParam = endTime && typeof endTime === "string" && endTime.trim() ? endTime : null
  await dbExecute(
    `
    UPDATE bookings
    SET
      date = COALESCE(?, date),
      start_time = COALESCE(?, start_time),
      end_time = COALESCE(?, end_time),
      activity_id = COALESCE(?, activity_id),
      venue_id = COALESCE(?, venue_id),
      guest_name = COALESCE(?, guest_name),
      suite_number = COALESCE(?, suite_number),
      pax = COALESCE(?, pax),
      ga_name = COALESCE(?, ga_name),
      driver_name = COALESCE(?, driver_name),
      bill = COALESCE(?, bill),
      remark = COALESCE(?, remark),
      status = COALESCE(?, status),
      updated_by = ?
    WHERE id = ?
  `,
    [
      date ?? null,
      startTime ?? null,
      endTimeParam,
      activityId ?? null,
      venueId ?? null,
      guestName ?? null,
      suiteNumber ?? null,
      pax ?? null,
      gaName ?? null,
      driverName ?? null,
      bill ?? null,
      remark ?? null,
      status ?? null,
      userId,
      id,
    ],
  )

  const updatedData = await getBooking(id)
  const updatedRaw = await getRawBooking(id)
  if (!updatedData || !updatedRaw) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  const valueCache = new Map<string, string | null>()
  const trackedFields = [
    { key: "date", label: "Date" },
    { key: "start_time", label: "Start Time" },
    { key: "end_time", label: "End Time" },
    { key: "activity_id", label: "Activity" },
    { key: "venue_id", label: "Venue" },
    { key: "guest_name", label: "Guest Name" },
    { key: "suite_number", label: "Suite Number" },
    { key: "pax", label: "Pax" },
    { key: "ga_name", label: "GA Name" },
    { key: "driver_name", label: "Driver Name" },
    { key: "bill", label: "Bill" },
    { key: "remark", label: "Remark" },
    { key: "status", label: "Status" },
  ] as const

  const formatFieldValue = async (field: string, value: any): Promise<string | null> => {
    if (value === null || typeof value === "undefined") return null
    const cacheKey = `${field}:${value}`
    if (valueCache.has(cacheKey)) return valueCache.get(cacheKey) ?? null
    let formatted: string | null = null
    switch (field) {
      case "date":
        formatted = String(value)
        break
      case "start_time":
      case "end_time":
        formatted = typeof value === "string" ? toHHmm(value) : null
        break
      case "pax":
        formatted = String(value)
        break
      case "activity_id": {
        const rows = await dbQuery<{ name: string }[]>("SELECT name FROM activities WHERE id = ? LIMIT 1", [value])
        formatted = rows[0]?.name || value
        break
      }
      case "venue_id": {
        const rows = await dbQuery<{ name: string }[]>("SELECT name FROM venues WHERE id = ? LIMIT 1", [value])
        formatted = rows[0]?.name || value
        break
      }
      default:
        formatted = typeof value === "string" ? value : String(value)
    }
    valueCache.set(cacheKey, formatted)
    return formatted
  }

  const changes: Array<{ field: string; label: string; oldValue: string | null; newValue: string | null }> = []
  for (const field of trackedFields) {
    const oldValueRaw = originalRaw[field.key]
    const newValueRaw = updatedRaw[field.key]
    if ((oldValueRaw ?? null) === (newValueRaw ?? null)) continue
    const [oldValue, newValue] = await Promise.all([
      formatFieldValue(field.key, oldValueRaw),
      formatFieldValue(field.key, newValueRaw),
    ])
    if (oldValue === newValue) continue
    changes.push({ field: field.key, label: field.label, oldValue, newValue })
  }

  if (changes.length > 0) {
    await dbExecute("INSERT INTO booking_history (id, booking_id, actor_id, action, changes) VALUES (?, ?, ?, 'updated', ?)", [
      randomUUID(),
      id,
      userId,
      JSON.stringify(changes),
    ])
  }

  return NextResponse.json(updatedData)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const userRole = (session.user as any)?.role ?? "staff"
  if (userRole !== "admin") {
    return NextResponse.json({ error: "Only admins may delete bookings" }, { status: 403 })
  }
  const exists = await dbQuery("SELECT 1 FROM bookings WHERE id = ? LIMIT 1", [id])
  if (exists.length === 0) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }
  await dbExecute("DELETE FROM bookings WHERE id = ?", [id])
  return NextResponse.json({ ok: true })
}
