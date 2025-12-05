import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

const toHHmm = (t: string) => {
  const [h, m] = t.split(":")
  return `${h.padStart(2, "0")}:${(m || "00").padStart(2, "0")}`
}

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
           b.bill,
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
  const role = (session.user as any)?.role as string | undefined
  if (role === "viewer") {
    return NextResponse.json({ error: "Anda tidak diijinkan mengubah booking" }, { status: 403 })
  }
  const { id } = await params
  const userId = (session.user as any)?.id ?? null
  const originalRawRows = await sql<any[]>`
    SELECT date, start_time, end_time, activity_id, venue_id, guest_name, suite_number, pax, ga_name, driver_name, bill, remark, status
    FROM bookings
    WHERE id = ${id}
    LIMIT 1
  `
  if (originalRawRows.length === 0) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }
  const originalRaw = originalRawRows[0]
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

  // Conflict check for single-booking-per-day venues
  const allowOverride = allowTentativeOverride === true

  if (venueId && date && !allowOverride) {
    const venues = await sql<{ is_single_booking_per_day: boolean; is_exclusive_by_time: boolean; name: string }[]>`
      SELECT is_single_booking_per_day, is_exclusive_by_time, name FROM venues WHERE id = ${venueId} LIMIT 1
    `
    const v = venues[0]
    if (v?.is_single_booking_per_day) {
      const conflicts = await sql`SELECT 1 FROM bookings WHERE date = ${date} AND venue_id = ${venueId} AND status IN ('confirmed','done') AND id <> ${id} LIMIT 1`
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
          WHERE date = ${date}::date AND venue_id = ${venueId}::uuid AND status IN ('confirmed','done') AND id <> ${id}
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
        bill = COALESCE(${bill ?? null}, bill),
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
      updated.bill,
      updated.remark,
      updated.status,
      updated.created_at as "createdAt",
      updated.updated_at as "updatedAt",
      updated.created_by as "createdById",
      updated.updated_by as "updatedById",
      creator.name as "createdByName",
      updater.name as "updatedByName",
      updated.date as "_raw_date",
      updated.start_time as "_raw_start_time",
      updated.end_time as "_raw_end_time",
      updated.activity_id as "_raw_activity_id",
      updated.venue_id as "_raw_venue_id",
      updated.guest_name as "_raw_guest_name",
      updated.suite_number as "_raw_suite_number",
      updated.pax as "_raw_pax",
      updated.ga_name as "_raw_ga_name",
      updated.driver_name as "_raw_driver_name",
      updated.bill as "_raw_bill",
      updated.remark as "_raw_remark",
      updated.status as "_raw_status"
    FROM updated
    LEFT JOIN profiles creator ON creator.id = updated.created_by
    LEFT JOIN profiles updater ON updater.id = updated.updated_by
  `
  if (rows.length === 0) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }
  const updatedData = rows[0]
  const updatedRaw = {
    date: updatedData._raw_date,
    start_time: updatedData._raw_start_time,
    end_time: updatedData._raw_end_time,
    activity_id: updatedData._raw_activity_id,
    venue_id: updatedData._raw_venue_id,
    guest_name: updatedData._raw_guest_name,
    suite_number: updatedData._raw_suite_number,
    pax: updatedData._raw_pax,
    ga_name: updatedData._raw_ga_name,
    driver_name: updatedData._raw_driver_name,
    bill: updatedData._raw_bill,
    remark: updatedData._raw_remark,
    status: updatedData._raw_status,
  }
  const rawKeys = [
    "_raw_date",
    "_raw_start_time",
    "_raw_end_time",
    "_raw_activity_id",
    "_raw_venue_id",
    "_raw_guest_name",
    "_raw_suite_number",
    "_raw_pax",
    "_raw_ga_name",
    "_raw_driver_name",
    "_raw_bill",
    "_raw_remark",
    "_raw_status",
  ]
  rawKeys.forEach((key) => {
    delete (updatedData as any)[key]
  })

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
        formatted = typeof value === "string" ? value : String(value)
        break
      case "start_time":
      case "end_time":
        formatted = typeof value === "string" ? toHHmm(value) : null
        break
      case "pax":
        formatted = value !== null ? String(value) : null
        break
      case "activity_id": {
        const rows = await sql<{ name: string }[]>`SELECT name FROM activities WHERE id = ${value} LIMIT 1`
        formatted = rows[0]?.name || value
        break
      }
      case "venue_id": {
        const rows = await sql<{ name: string }[]>`SELECT name FROM venues WHERE id = ${value} LIMIT 1`
        formatted = rows[0]?.name || value
        break
      }
      default:
        formatted = typeof value === "string" ? value : value !== null ? String(value) : null
    }
    valueCache.set(cacheKey, formatted)
    return formatted
  }

  const changes: Array<{ field: string; label: string; oldValue: string | null; newValue: string | null }> = []
  for (const field of trackedFields) {
    const oldValueRaw = (originalRaw as any)[field.key]
    const newValueRaw = (updatedRaw as any)[field.key]
    if ((oldValueRaw ?? null) === (newValueRaw ?? null)) {
      continue
    }
    const [oldValue, newValue] = await Promise.all([
      formatFieldValue(field.key, oldValueRaw),
      formatFieldValue(field.key, newValueRaw),
    ])
    if (oldValue === newValue) continue
    changes.push({
      field: field.key,
      label: field.label,
      oldValue,
      newValue,
    })
  }

  if (changes.length > 0) {
    await sql`
      INSERT INTO booking_history (booking_id, actor_id, action, changes)
      VALUES (${id}, ${userId}, 'updated', ${JSON.stringify(changes)}::jsonb)
    `
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
  const exists = await sql`SELECT 1 FROM bookings WHERE id = ${id} LIMIT 1`
  if (exists.length === 0) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }
  await sql`DELETE FROM bookings WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
