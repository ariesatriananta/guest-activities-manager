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

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case "confirmed":
        return "default"
      case "draft":
        return "secondary"
      case "cancelled":
        return "destructive"
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
        status: "draft",
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
        <SheetHeader>
          <SheetTitle>Booking Details</SheetTitle>
          <SheetDescription>View and manage this booking</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{activity?.name}</h3>
            <Badge variant={getStatusColor(booking.status)}>{booking.status}</Badge>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{booking.date}</p>
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

            <Button variant="outline" className="w-full bg-transparent" onClick={handleExportICS}>
              <Download className="h-4 w-4 mr-2" />
              Export ICS
            </Button>

            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={handleDuplicate}
              disabled={isDuplicating}
            >
              <Copy className="h-4 w-4 mr-2" />
              {isDuplicating ? "Duplicating..." : "Duplicate"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
