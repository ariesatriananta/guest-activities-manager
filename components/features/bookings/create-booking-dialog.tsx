"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BookingForm } from "./booking-form"
import { useCreateBooking } from "@/lib/hooks/useBookings"
import { useRouter } from "next/navigation"
import type { BookingFormData } from "@/lib/types"
import { todayISOInJakarta, formatDateISOInTZ, JAKARTA_TZ } from "@/lib/utils"

interface CreateBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: Date | null
  defaultTime?: string | null
  defaultStartTime?: string | null
  defaultEndTime?: string | null
  defaultVenueId?: string | null
}

export function CreateBookingDialog({ open, onOpenChange, defaultDate, defaultTime, defaultStartTime, defaultEndTime, defaultVenueId }: CreateBookingDialogProps) {
  const router = useRouter()
  const createBooking = useCreateBooking()

  const handleSubmit = async (data: BookingFormData) => {
    try {
      await createBooking.mutateAsync({
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        activityId: data.activityId,
        venueId: data.venueId,
        guestName: data.guestName,
        suiteNumber: data.suiteNumber,
        pax: data.pax,
        gaName: data.gaName,
        driverName: data.driverName,
        remark: data.remark,
        status: data.status,
      })
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Failed to create booking:", error)
    }
  }

  const defaultValues = {
    date: defaultDate ? formatDateISOInTZ(defaultDate, JAKARTA_TZ) : todayISOInJakarta(),
    startTime: defaultStartTime || defaultTime || "",
    endTime: defaultEndTime || "",
    categoryId: "",
    activityId: "",
    venueId: defaultVenueId || "",
    guestName: "",
    suiteNumber: "",
    pax: 1,
    gaName: "",
    driverName: "",
    remark: "",
    status: "confirmed" as const,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
          <DialogDescription>Fill in the details for the new booking</DialogDescription>
        </DialogHeader>
        <BookingForm defaultValues={defaultValues} onSubmit={handleSubmit} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
