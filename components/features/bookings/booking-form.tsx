"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { todayISOInJakarta } from "@/lib/utils"
import { DateField } from "@/components/ui/date-field"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useCategories, useActivitiesByCategory } from "@/lib/hooks/useActivities"
import { useVenues, useVenue } from "@/lib/hooks/useVenues"
import { useCheckVenueConflict } from "@/lib/hooks/useBookings"
import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { BookingFormData } from "@/lib/types"

const bookingSchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  activityId: z.string().min(1, "Activity is required"),
  venueId: z.string().min(1, "Venue is required"),
  guestName: z.string().min(1, "Guest name is required"),
  suiteNumber: z.string().min(1, "Suite number is required"),
  pax: z.coerce.number().min(1, "Pax must be at least 1"),
  gaName: z.string().default(""),
  driverName: z.string().default(""),
  remark: z.string().default(""),
  status: z.enum(["draft", "confirmed", "cancelled"]),
})

interface BookingFormProps {
  defaultValues?: Partial<BookingFormData>
  onSubmit: (data: BookingFormData) => void
  onCancel?: () => void
  excludeBookingId?: string
}

export function BookingForm({ defaultValues, onSubmit, onCancel, excludeBookingId }: BookingFormProps) {
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [conflictVenueName, setConflictVenueName] = useState("")
  const [conflictDate, setConflictDate] = useState("")
  const [conflictGuest, setConflictGuest] = useState("")
  const [conflictActivity, setConflictActivity] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const { data: categories } = useCategories()
  const { data: venues } = useVenues()

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      date: todayISOInJakarta(),
      startTime: "",
      endTime: "",
      categoryId: "",
      activityId: "",
      venueId: "",
      guestName: "",
      suiteNumber: "",
      pax: 1,
      gaName: "",
      driverName: "",
      remark: "",
      status: "confirmed",
      ...defaultValues,
    },
  })

  const selectedCategoryId = form.watch("categoryId")
  const selectedVenueId = form.watch("venueId")
  const selectedDate = form.watch("date")

  const { data: activities, isLoading: loadingActivities } = useActivitiesByCategory(selectedCategoryId)
  const { data: selectedVenue } = useVenue(selectedVenueId)
  const checkConflict = useCheckVenueConflict()

  // Reset activity when category changes
  useEffect(() => {
    if (selectedCategoryId && !defaultValues?.activityId) {
      form.setValue("activityId", "")
    }
  }, [selectedCategoryId, form, defaultValues?.activityId])

  // Preset: Ramayana Royal Feast Dinner
  const applyRamayanaPreset = () => {
    form.setValue("startTime", "19:00")
    form.setValue("endTime", "21:00")
    const poolTerrace = venues?.find((v) => v.name === "Pool Terrace")
    if (poolTerrace) {
      form.setValue("venueId", poolTerrace.id)
    }
  }

  const handleFormSubmit = async (data: BookingFormData) => {
    setSubmitting(true)
    // Check for venue conflict
    if (selectedVenue?.isSingleBookingPerDay && selectedDate && selectedVenueId) {
      const conflict = await checkConflict.mutateAsync({
        date: selectedDate,
        venueId: selectedVenueId,
        excludeBookingId,
      })

      if (conflict?.hasConflict) {
        setConflictVenueName(selectedVenue.name)
        setConflictDate(selectedDate)
        setConflictGuest(conflict.guestName || "")
        setConflictActivity(conflict.activityName || "")
        setShowConflictDialog(true)
        setSubmitting(false)
        return
      }
    }

    try {
      await onSubmit(data)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <DateField value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity</FormLabel>
                  <div className="flex gap-2 max-sm:flex-col">
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedCategoryId || loadingActivities}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={loadingActivities ? "Loading..." : "Select activity"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activities?.map((activity) => (
                          <SelectItem key={activity.id} value={activity.id}>
                            {activity.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {activities?.find((a) => a.name === "Ramayana Royal Feast Dinner") && (
                      <Button type="button" variant="outline" size="sm" onClick={applyRamayanaPreset}>
                        Preset
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="venueId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select venue" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {venues?.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id}>
                          {venue.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedVenue?.isSingleBookingPerDay && (
                    <Badge variant="secondary" className="mt-1">
                      Single-day booking only
                    </Badge>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guestName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guest Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="suiteNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Suite Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pax</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gaName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GA Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="driverName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Driver Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="remark"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Remark</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2 justify-end max-sm:flex-col max-sm:items-stretch">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? "Saving..." : "Save Booking"}
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Venue Conflict</AlertDialogTitle>
            <AlertDialogDescription>
              The venue <strong>{conflictVenueName}</strong> already has a booking on <strong>{conflictDate}</strong>.
              {" "}
              {conflictGuest && conflictActivity ? (
                <>
                  By <strong>{conflictGuest}</strong> do <strong>{conflictActivity}</strong>.
                </>
              ) : null}
              {" "}This venue only allows one booking per day. Please select a different venue or date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => setShowConflictDialog(false)}>OK</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Inline mobile date picker using Dialog + Calendar
// cleaned: single Popover calendar pattern for all devices

