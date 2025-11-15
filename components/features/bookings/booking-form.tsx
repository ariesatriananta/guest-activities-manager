"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { todayISOInJakarta } from "@/lib/utils"
import { format } from "date-fns"
import { DateField } from "@/components/ui/date-field"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useCategories, useActivitiesByCategory } from "@/lib/hooks/useActivities"
import { useVenues, useVenue } from "@/lib/hooks/useVenues"
import { Skeleton } from "@/components/ui/skeleton"
import { useCheckVenueConflict } from "@/lib/hooks/useBookings"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  status: z.enum(["tentative", "confirmed", "cancelled", "done"]),
})

interface BookingFormProps {
  defaultValues?: Partial<BookingFormData>
  onSubmit: (data: BookingFormData) => void
  onCancel?: () => void
  excludeBookingId?: string
}

export function BookingForm({ defaultValues, onSubmit, onCancel, excludeBookingId }: BookingFormProps) {
  const router = useRouter()
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [conflictVenueName, setConflictVenueName] = useState("")
  const [conflictDate, setConflictDate] = useState("")
  const [conflictGuest, setConflictGuest] = useState("")
  const [conflictActivity, setConflictActivity] = useState("")
  const [conflictStatus, setConflictStatus] = useState("")
  const [conflictPolicy, setConflictPolicy] = useState<string>("")
  const [conflictMode, setConflictMode] = useState<"hard" | "tentative">("hard")
  const [conflictHint, setConflictHint] = useState<"existing" | "new">()
  const [pendingData, setPendingData] = useState<BookingFormData | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const formatConflictDate = (date: string) => {
    if (!date) return ""
    try {
      return format(new Date(`${date}T00:00:00+07:00`), "dd MMM yyyy")
    } catch {
      return date
    }
  }

  const closeConflictDialog = () => {
    setShowConflictDialog(false)
    setPendingData(null)
    setConflictHint(undefined)
  }

  const handleConflictOverride = async () => {
    if (!pendingData) {
      closeConflictDialog()
      return
    }
    setShowConflictDialog(false)
    await handleFormSubmit(pendingData, { skipConflict: true })
    setPendingData(null)
    setConflictHint(undefined)
  }

  const { data: categories, isLoading: loadingCategories } = useCategories()
  const { data: venues, isLoading: loadingVenues } = useVenues()

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

  const handleFormSubmit = async (data: BookingFormData, options?: { skipConflict?: boolean }) => {
    setSubmitting(true)
    try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
    // Check for venue conflict (per-day or exclusive-by-time)
    const isExclusive = (selectedVenue as any)?.isExclusiveByTime === true
    const isPerDay = selectedVenue?.isSingleBookingPerDay === true
    const isEditing = Boolean(excludeBookingId)
    const statusAllowsOverride = ["tentative", "cancelled"].includes(data.status || "")
    const shouldSkipForStatus = isEditing && statusAllowsOverride

    if (!options?.skipConflict && !shouldSkipForStatus && (isPerDay || isExclusive) && selectedDate && selectedVenueId) {
      const conflict = await checkConflict.mutateAsync({
        date: selectedDate,
        venueId: selectedVenueId,
        excludeBookingId,
        startTime: form.getValues("startTime"),
        endTime: form.getValues("endTime"),
      })

      if (conflict?.hasConflict) {
        const conflictStatusVal = (conflict as any)?.status || ""
        setConflictVenueName(selectedVenue.name)
        setConflictDate(formatConflictDate(selectedDate))
        setConflictGuest(conflict.guestName || "")
        setConflictActivity(conflict.activityName || "")
        setConflictStatus(conflictStatusVal)
        setConflictPolicy((conflict as any)?.policy || "")
        const isFormTentative = data.status === "tentative"
        if (conflictStatusVal === "tentative" || isFormTentative) {
          setConflictMode("tentative")
          setPendingData(data)
          setConflictHint(conflictStatusVal === "tentative" ? "existing" : "new")
        } else {
          setConflictMode("hard")
          setPendingData(null)
          setConflictHint(undefined)
        }
        setShowConflictDialog(true)
        setSubmitting(false)
        try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {}
        return
      }
    }

    const allowOverrideFlag = options?.skipConflict || shouldSkipForStatus
    const payload = allowOverrideFlag
      ? { ...data, allowTentativeOverride: true }
      : data

    try {
      await onSubmit(payload)
    } finally {
      setSubmitting(false)
      try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {}
    }
  }

  // Detect mobile viewport for custom 24h time picker
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 640px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const renderTimeSelect = (value: string, onChange: (v: string) => void) => {
    const [hRaw, mRaw] = (value || '').split(':')
    const hh = (hRaw ?? '00').padStart(2, '0')
    const mm = (mRaw ?? '00').padStart(2, '0')
    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
    const minuteOptions = ['00', '30']
    const mmNumeric = Number.isFinite(parseInt(mm || '0', 10)) ? (parseInt(mm || '0', 10) % 60) : 0
    const mmSel = minuteOptions.includes(mm)
      ? mm
      : minuteOptions[Math.floor(mmNumeric / 30)]
    return (
      <div className="flex items-center gap-2">
        <Select value={hh} onValueChange={(h) => onChange(`${h}:${mm}`)}>
          <SelectTrigger className="w-24"><SelectValue placeholder="HH" /></SelectTrigger>
          <SelectContent className="max-h-60">
            {hours.map((h) => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">:</span>
        <Select value={mmSel} onValueChange={(m) => onChange(`${hh}:${m}`)}>
          <SelectTrigger className="w-24"><SelectValue placeholder="MM" /></SelectTrigger>
          <SelectContent className="max-h-60">
            {minuteOptions.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300'
      case 'tentative':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300'
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 border-red-500/25 dark:text-red-300'
      case 'done':
        return 'bg-sky-500/10 text-sky-700 border-sky-500/25 dark:text-sky-300'
      default:
        return ''
    }
  }

  return (
    <>
      {(loadingCategories || loadingVenues) ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      ) : (
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => handleFormSubmit(data))} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status + Date side-by-side on mobile */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className={`w-full border ${getStatusStyle(field.value)}`}>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="tentative" className="data-[highlighted]:bg-amber-500/15 data-[state=checked]:bg-amber-500/15">
                          Tentative
                        </SelectItem>
                        <SelectItem value="confirmed" className="data-[highlighted]:bg-emerald-500/15 data-[state=checked]:bg-emerald-500/15">
                          Confirmed
                        </SelectItem>
                        <SelectItem value="cancelled" className="data-[highlighted]:bg-red-500/15 data-[state=checked]:bg-red-500/15">
                          Cancelled
                        </SelectItem>
                        <SelectItem value="done" className="data-[highlighted]:bg-sky-500/15 data-[state=checked]:bg-sky-500/15">
                          Done
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            </div>

            <div className="grid grid-cols-2 gap-4 relative">
              <div aria-hidden className="pointer-events-none absolute inset-y-1 left-1/2 -translate-x-1/2 w-px bg-border" />
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      {isMobile ? (
                        renderTimeSelect(field.value, (v) => field.onChange(v))
                      ) : (
                        <Input type="time" {...field} />
                      )}
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
                     <FormLabel>End Time{(selectedVenue as any)?.isExclusiveByTime ? ' *' : ''}</FormLabel>
                    <FormControl>
                       {isMobile ? (
                        renderTimeSelect(field.value, (v) => field.onChange(v))
                      ) : (
                        <Input type="time" {...field} required={(selectedVenue as any)?.isExclusiveByTime === true} />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Category + Activity side-by-side; hide Preset for now */}
            <div className="grid grid-cols-2 gap-4">
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
                        {(categories || [])
                          .slice()
                          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
                          .map((category) => (
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
                          {(activities || [])
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
                            .map((activity) => (
                            <SelectItem key={activity.id} value={activity.id}>
                              {activity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Preset hidden for now */}
                      {/* <Button type="button" variant="outline" size="sm" onClick={applyRamayanaPreset}>Preset</Button> */}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                      {(venues || [])
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
                        .map((venue) => (
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
                  {selectedVenue?.isExclusiveByTime && (
                    <Badge variant="secondary" className="mt-1">
                      Exclusive by time
                    </Badge>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Guest / Suite / Pax in 50% / 30% / 20% */}
            <div className="grid grid-cols-10 gap-4">
              <div className="col-span-5">
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
              </div>
              <div className="col-span-3">
                <FormField
                  control={form.control}
                  name="suiteNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suite</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-2">
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
              </div>
            </div>

            {/* GA & Driver side-by-side on mobile */}
            <div className="grid grid-cols-2 gap-4">
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
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? "Saving..." : "Save Booking"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (onCancel) {
                  onCancel()
                } else {
                  try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
                  // Prefer history back, fallback to /bookings
                  if (typeof window !== 'undefined' && window.history.length > 1) {
                    router.back()
                  } else {
                    router.push('/bookings')
                  }
                  setTimeout(() => { try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {} }, 50)
                }
              }}
              disabled={submitting}
            >
              Back
            </Button>
          </div>
        </form>
      </Form>
      )}

      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Venue Conflict</AlertDialogTitle>
            <AlertDialogDescription>
              The venue <strong>{conflictVenueName}</strong> already has a booking on <strong>{conflictDate}</strong>.
              {" "}
              {conflictGuest && conflictActivity ? (
                <>
                  By <strong>{conflictGuest}</strong> do <strong>{conflictActivity}</strong>
                  {conflictStatus ? (
                    <> 
                      <Badge variant="outline" className={`${getStatusStyle(conflictStatus)} text-[10px] px-2 py-0.5 ml-1`}>{conflictStatus}</Badge>
                    </>
                  ) : null}.
                </>
              ) : null}
              {" "}
              {conflictPolicy === 'exclusive_time' ? (
                <>This venue is exclusive by time. Overlapping time slots are not allowed. Please choose a different time or venue.</>
              ) : (
                <>This venue only allows one booking per day. Please select a different venue or date.</>
              )}
              {conflictMode === "tentative" ? (
                <span className="block mt-2 text-xs text-muted-foreground">
                  {conflictHint === "existing"
                    ? "The existing booking is still tentative. You may continue submitting if you want to overlap or override it."
                    : "You are creating a tentative booking. You may continue submitting if you want to allow an overlap."}
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {conflictMode === "tentative" ? (
              <>
                <Button variant="outline" onClick={closeConflictDialog}>Cancel</Button>
                <Button onClick={handleConflictOverride}>Submit anyway</Button>
              </>
            ) : (
              <Button onClick={closeConflictDialog}>OK</Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Inline mobile date picker using Dialog + Calendar
// cleaned: single Popover calendar pattern for all devices
