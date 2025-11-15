"use client"

import { BookingForm } from "@/components/features/bookings/booking-form"
import { useCreateBooking } from "@/lib/hooks/useBookings"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { BookingFormData } from "@/lib/types"
import { toast } from "sonner"

export default function NewBookingPage() {
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
        allowTentativeOverride: data.allowTentativeOverride,
      })
      toast.success("Booking created")
      try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back()
      } else {
        router.push('/bookings')
      }
      setTimeout(() => { try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {} }, 50)
    } catch (error) {
      console.error("[v0] Failed to create booking:", error)
      toast.error((error as any)?.message || "Failed to create booking")
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back()
              } else {
                router.push('/bookings')
              }
              setTimeout(() => { try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {} }, 50)
            }}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">New Booking</h1>
            <p className="text-muted-foreground">Create a new guest activity booking</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
            <CardDescription>Fill in the details for the new booking</CardDescription>
          </CardHeader>
          <CardContent>
            <BookingForm
              onSubmit={handleSubmit}
              onCancel={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  router.back()
                } else {
                  router.push('/bookings')
                }
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
