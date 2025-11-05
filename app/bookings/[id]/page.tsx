"use client"

import { BookingForm } from "@/components/features/bookings/booking-form"
import { useBooking, useUpdateBooking, useDeleteBooking } from "@/lib/hooks/useBookings"
import { useActivities } from "@/lib/hooks/useActivities"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trash2 } from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { use } from "react"
import type { BookingFormData } from "@/lib/types"
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
  const updateBooking = useUpdateBooking()
  const deleteBooking = useDeleteBooking()

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
          remark: data.remark,
          status: data.status,
        },
      })
      router.push("/bookings")
    } catch (error) {
      console.error("[v0] Failed to update booking:", error)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteBooking.mutateAsync(id)
      router.push("/bookings")
    } catch (error) {
      console.error("[v0] Failed to delete booking:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
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

  const activity = activities?.find((a) => a.id === booking.activityId)

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/bookings">
                <ArrowLeft className="h-5 w-5" />
              </Link>
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
                remark: booking.remark || "",
                status: booking.status,
              }}
              onSubmit={handleSubmit}
              onCancel={() => router.push("/bookings")}
              excludeBookingId={id}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
