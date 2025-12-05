"use client"

import { BookingForm } from "@/components/features/bookings/booking-form"
import { useBooking, useUpdateBooking, useDeleteBooking } from "@/lib/hooks/useBookings"
import { useActivities } from "@/lib/hooks/useActivities"
import { useVenues } from "@/lib/hooks/useVenues"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trash2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { use } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import type { BookingFormData } from "@/lib/types"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function EditBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined
  const { id } = use(params)
  const router = useRouter()
  const { data: booking, isLoading } = useBooking(id)
  const { data: activities } = useActivities()
  const { data: venues } = useVenues()
  const updateBooking = useUpdateBooking()
  const deleteBooking = useDeleteBooking()
  const activity = activities?.find((a) => a.id === booking?.activityId)

  const handleSubmit = async (data: BookingFormData) => {
    try {
      await updateBooking.mutateAsync({
        id,
        data: {
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
          bill: data.bill,
          remark: data.remark,
          status: data.status,
          allowTentativeOverride: data.allowTentativeOverride,
        },
      })
      toast.success("Booking updated")
      try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back()
      } else {
        router.push('/bookings')
      }
      setTimeout(() => { try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {} }, 50)
    } catch (error) {
      console.warn("[v0] Failed to update booking:", error)
      toast.error((error as any)?.message || "Failed to update booking")
    }
  }

  const handleDelete = async () => {
    try {
      await deleteBooking.mutateAsync(id)
      toast.success("Booking deleted")
      try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back()
      } else {
        router.push('/bookings')
      }
      setTimeout(() => { try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {} }, 50)
    } catch (error) {
      console.warn("[v0] Failed to delete booking:", error)
      toast.error((error as any)?.message || "Failed to delete booking")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-md" />
              <div>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56 mt-1" />
              </div>
            </div>
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
              <CardDescription>Update the booking information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ))}
                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-28" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Booking not found</p>
      </div>
    )
  }

  if (role === "viewer") {
    const venueName = venues?.find((v) => v.id === booking.venueId)?.name || booking.venueId
    const activityName = activity?.name
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back()
                } else {
                  router.push("/bookings")
                }
              }}
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Booking Detail</h1>
              <p className="text-muted-foreground">Anda tidak diijinkan mengubah booking ini.</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{activityName || "Booking"}</CardTitle>
              <CardDescription>{booking.guestName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{booking.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">{booking.startTime} - {booking.endTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Venue</span>
                <span className="font-medium">{venueName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{booking.status}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
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
              <h1 className="text-3xl font-bold">Edit Booking</h1>
              <p className="text-muted-foreground">Update booking details</p>
            </div>
          </div>

          {role === "admin" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Booking</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this booking? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
            <CardDescription>Update the booking information</CardDescription>
          </CardHeader>
          <CardContent>
            <BookingForm
              defaultValues={{
                date: booking.date,
                startTime: booking.startTime,
                endTime: booking.endTime || "",
                categoryId: activity?.categoryId || "",
                activityId: booking.activityId,
                venueId: booking.venueId,
                guestName: booking.guestName,
                suiteNumber: booking.suiteNumber,
                pax: booking.pax,
                gaName: booking.gaName || "",
                driverName: booking.driverName || "",
                bill: booking.bill || "",
                remark: booking.remark || "",
                status: booking.status,
              }}
              onSubmit={handleSubmit}
              onCancel={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  router.back()
                } else {
                  router.push('/bookings')
                }
              }}
              excludeBookingId={id}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
