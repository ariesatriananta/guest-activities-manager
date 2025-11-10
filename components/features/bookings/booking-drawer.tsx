"use client"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Edit, Printer, Download, Copy } from "lucide-react"
import { useRouter } from "next/navigation"
import { useActivities } from "@/lib/hooks/useActivities"
import { useVenues } from "@/lib/hooks/useVenues"
import { useCreateBooking } from "@/lib/hooks/useBookings"
import type { Booking, BookingStatus } from "@/lib/types"
import { useState } from "react"

interface BookingDrawerProps {
  booking: Booking | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onClose: () => void
}

export function BookingDrawer({ booking, open, onOpenChange, onClose }: BookingDrawerProps) {
  const router = useRouter()
  const { data: activities } = useActivities()
  const { data: venues } = useVenues()
  const createBooking = useCreateBooking()
  const [isDuplicating, setIsDuplicating] = useState(false)

  if (!booking) return null

  const activity = activities?.find((a) => a.id === booking.activityId)
  const venue = venues?.find((v) => v.id === booking.venueId)

  const formatDateWithDay = (iso: string) => {
    if (!iso) return ""
    const [y, m, d] = iso.split("-")
    const date = new Date(`${iso}T00:00:00+07:00`)
    const day = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Jakarta" }).format(date)
    return `${day}, ${d}/${m}/${y}`
  }

  const formatDateTimeWithDayJakarta = (iso: string) => {
    if (!iso) return ""
    const dt = new Date(iso)
    const day = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Jakarta" }).format(dt)
    const datePart = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jakarta" }).format(dt)
    const timePart = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(dt)
    return `${day}, ${datePart}, ${timePart} (WIB)`
  }

  const getStatusBadgeClass = (status: BookingStatus) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-300"
      case "tentative":
        return "bg-amber-500/15 text-amber-700 border-amber-500/25 dark:text-amber-300"
      case "cancelled":
        return "bg-red-500/15 text-red-700 border-red-500/25 dark:text-red-300"
      default:
        return ""
    }
  }

  const handleEdit = () => {
    router.push(`/bookings/${booking.id}`)
    onClose()
  }

  const handlePrintBEO = () => {
    router.push(`/bookings/${booking.id}/beo`)
    onClose()
  }

  const handleExportICS = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Guest Activities Manager//EN
BEGIN:VEVENT
UID:${booking.id}@guestactivities.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTSTART:${booking.date.replace(/-/g, "")}T${booking.startTime.replace(":", "")}00
DTEND:${booking.date.replace(/-/g, "")}T${booking.endTime.replace(":", "")}00
SUMMARY:${activity?.name || "Activity"} - ${booking.guestName}
DESCRIPTION:Guest: ${booking.guestName}\\nSuite: ${booking.suiteNumber}\\nPax: ${booking.pax}\\nVenue: ${venue?.name}
LOCATION:${venue?.name || ""}
STATUS:${booking.status.toUpperCase()}
END:VEVENT
END:VCALENDAR`

    const blob = new Blob([icsContent], { type: "text/calendar" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `booking-${booking.id}.ics`
    a.click()
  }

  const handleDuplicate = async () => {
    setIsDuplicating(true)
    try {
      await createBooking.mutateAsync({
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        activityId: booking.activityId,
        venueId: booking.venueId,
        guestName: booking.guestName,
        suiteNumber: booking.suiteNumber,
        pax: booking.pax,
        gaName: booking.gaName,
        driverName: booking.driverName,
        remark: `${booking.remark} (Duplicate)`,
        status: "tentative",
      })
      onClose()
    } catch (error) {
      console.error("[v0] Failed to duplicate booking:", error)
    } finally {
      setIsDuplicating(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pt-6 pr-10 pb-3">
          <SheetTitle className="text-base sm:text-lg">Booking Details</SheetTitle>
          <SheetDescription className="text-xs sm:text-sm">View and manage this booking</SheetDescription>
          <div className="mt-1 flex items-center justify-between gap-3">
            <h3 className="text-sm sm:text-base font-semibold truncate">{activity?.name}</h3>
            <Badge variant="outline" className={getStatusBadgeClass(booking.status)}>{booking.status}</Badge>
          </div>
        </SheetHeader>

        <div className="mt-3 space-y-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{formatDateWithDay(booking.date)}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="font-medium">
                {booking.startTime} - {booking.endTime}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Venue</p>
              <p className="font-medium">{venue?.name}</p>
            </div>

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground">Guest Name</p>
              <p className="font-medium">{booking.guestName}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Suite Number</p>
              <p className="font-medium">{booking.suiteNumber}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Pax</p>
              <p className="font-medium">{booking.pax}</p>
            </div>

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground">GA Name</p>
              <p className="font-medium">{booking.gaName || "-"}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Driver Name</p>
              <p className="font-medium">{booking.driverName || "-"}</p>
            </div>

            {booking.remark && (
              <div>
                <p className="text-sm text-muted-foreground">Remark</p>
                <p className="font-medium">{booking.remark}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{formatDateTimeWithDayJakarta(booking.createdAt)}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Button className="w-full" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Booking
            </Button>

            <Button variant="outline" className="w-full bg-transparent" onClick={handlePrintBEO}>
              <Printer className="h-4 w-4 mr-2" />
              Print BEO
            </Button>

            {/* Close at the very bottom */}
            <Button variant="outline" className="w-full bg-transparent" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
