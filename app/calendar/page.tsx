"use client"

import { useState, useMemo, useEffect } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import listPlugin from "@fullcalendar/list"
import interactionPlugin from "@fullcalendar/interaction"
import type { EventClickArg, DateSelectArg } from "@fullcalendar/core"
import { useBookings } from "@/lib/hooks/useBookings"
import { useActivities, useCategories } from "@/lib/hooks/useActivities"
import { useVenues } from "@/lib/hooks/useVenues"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateISOInTZ, JAKARTA_TZ } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FilterX, Activity as ActivityIcon, MapPin, User, RefreshCcw, Loader2 } from "lucide-react"
import { CalendarFiltersSheet } from "@/components/features/calendar/filters-sheet"
import { BookingDrawer } from "@/components/features/bookings/booking-drawer"
import { CreateBookingDialog } from "@/components/features/bookings/create-booking-dialog"
import { NavLayout } from "@/components/layout/nav-layout"
import type { Booking } from "@/lib/types"

function CalendarContent() {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [viewType, setViewType] = useState<string>("dayGridMonth")

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)")
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [venueFilter, setVenueFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [search, setSearch] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)

  const { data: bookings, isLoading: loadingBookings, mutate: mutateBookings } = useBookings()
  const { data: categories, isLoading: loadingCategories, refetch: refetchCategories } = useCategories()
  const { data: activities, isLoading: loadingActivities, refetch: refetchActivities } = useActivities()
  const { data: venues, isLoading: loadingVenues, refetch: refetchVenues } = useVenues()
  const isLoadingAny = loadingBookings || loadingCategories || loadingActivities || loadingVenues
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
    try {
      await Promise.all([
        mutateBookings(),
        refetchCategories(),
        refetchActivities(),
        refetchVenues(),
      ])
    } finally {
      setRefreshing(false)
      try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {}
    }
  }

  // Load from URL once
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const q = sp.get("q") || ""
    const from = sp.get("from") || ""
    const to = sp.get("to") || ""
    const venue = sp.get("venue") || "all"
    const cat = sp.get("cat") || "all"
    if (q) setSearch(q)
    if (from) setDateFrom(from)
    if (to) setDateTo(to)
    if (venue) setVenueFilter(venue)
    if (cat) setCategoryFilter(cat)
  }, [])

  // Sync to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set("q", search.trim())
    if (dateFrom) params.set("from", dateFrom)
    if (dateTo) params.set("to", dateTo)
    if (venueFilter !== "all") params.set("venue", venueFilter)
    if (categoryFilter !== "all") params.set("cat", categoryFilter)
    const qs = params.toString()
    const url = qs ? `?${qs}` : ""
    history.replaceState(null, "", `/calendar${url}`)
  }, [search, dateFrom, dateTo, venueFilter, categoryFilter])

  const filteredBookings = useMemo(() => {
    if (!bookings) return []

    const activityToCategory = new Map<string, string>()
    activities?.forEach((a) => activityToCategory.set(a.id, a.categoryId))
    const venueMap = new Map<string, string>()
    venues?.forEach((v) => venueMap.set(v.id, v.name))
    const q = search.trim().toLowerCase()

    return bookings.filter((booking) => {
      if (booking.status === "cancelled") return false
      if (dateFrom && booking.date < dateFrom) return false
      if (dateTo && booking.date > dateTo) return false
      if (venueFilter !== "all" && booking.venueId !== venueFilter) return false
      if (categoryFilter !== "all") {
        const catId = activityToCategory.get(booking.activityId)
        if (catId !== categoryFilter) return false
      }
      if (q) {
        const venueName = venueMap.get(booking.venueId) || ""
        const hay = `${booking.guestName} ${booking.suiteNumber} ${venueName}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [bookings, dateFrom, dateTo, venueFilter, categoryFilter, activities, venues, search])

  // Patch: on mobile listWeek, force day header colspan to 2 (time + content)
  useEffect(() => {
    if (!isMobile || viewType !== "listWeek") return
    const patch = () => {
      try {
        const nodes = document.querySelectorAll(
          ".calendar-container .fc .fc-list-table .fc-list-day [colspan]",
        )
        nodes.forEach((el) => {
          const anyEl = el as HTMLElement
          if (anyEl.getAttribute("colspan") !== "2") {
            anyEl.setAttribute("colspan", "2")
          }
        })
      } catch {}
    }
    // run after FullCalendar renders
    const id = setTimeout(patch, 0)
    return () => clearTimeout(id)
  }, [isMobile, viewType, filteredBookings])

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (search.trim()) n++
    if (dateFrom) n++
    if (dateTo) n++
    if (venueFilter !== "all") n++
    if (categoryFilter !== "all") n++
    return n
  }, [search, dateFrom, dateTo, venueFilter, categoryFilter])

  const calendarEvents = useMemo(() => {
    if (!filteredBookings || !categories || !activities) return []

    // Map category -> stable color (desktop only)
    const palette = [
      "#3b82f6", // blue-500
      "#10b981", // emerald-500
      "#f59e0b", // amber-500
      "#8b5cf6", // violet-500
      "#ef4444", // red-500
      "#14b8a6", // teal-500
      "#f43f5e", // rose-500
      "#22c55e", // green-500
      "#06b6d4", // cyan-500
      "#eab308", // yellow-500
    ]
    const categoryIndex = new Map<string, number>()
    categories.forEach((c, i) => categoryIndex.set(c.id, i))

    // Map activity -> category
    const activityToCategory = new Map<string, string>()
    activities.forEach((a) => activityToCategory.set(a.id, a.categoryId))

    return filteredBookings.map((booking) => {
      const catId = activityToCategory.get(booking.activityId)
      const idx = typeof catId !== "undefined" && categoryIndex.has(catId) ? (categoryIndex.get(catId) as number) : 0
      const color = palette[idx % palette.length]

      // Only colorize on desktop; on mobile omit colors
      const colorProps = isMobile ? {} : { backgroundColor: color, borderColor: color }

      return {
        id: booking.id,
        title: booking.guestName,
        start: `${booking.date}T${booking.startTime}`,
        end: `${booking.date}T${booking.endTime}`,
        ...colorProps,
        extendedProps: {
          booking,
        },
      }
    })
  }, [filteredBookings, categories, activities, isMobile])

  const handleEventClick = (info: EventClickArg) => {
    const booking = info.event.extendedProps.booking as Booking
    setSelectedBooking(booking)
    setDrawerOpen(true)
  }

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedDate(selectInfo.start)
    setSelectedTime(selectInfo.start.toTimeString().slice(0, 5))
    setCreateDialogOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Calendar</h2>
          <p className="text-muted-foreground">View and manage bookings in calendar format</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Refresh"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {isLoadingAny ? (
          <>
            <Skeleton className="h-9 flex-1 min-w-[160px]" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </>
        ) : (
          <>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guest / suite / venue"
              className="flex-1 min-w-[160px]"
            />
            <CalendarFiltersSheet
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              values={{ dateFrom, dateTo, venueId: venueFilter, categoryId: categoryFilter }}
              onApply={(v) => { setDateFrom(v.dateFrom || ""); setDateTo(v.dateTo || ""); setVenueFilter(v.venueId); setCategoryFilter(v.categoryId) }}
              venues={venues || []}
              categories={categories || []}
              activeCount={activeFilterCount}
            />
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Clear Filters"
              onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setVenueFilter("all"); setCategoryFilter("all") }}
            >
              <FilterX className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="calendar-container">
            {isLoadingAny ? (
              <Skeleton className="h-[420px] w-full" />
            ) : (
            <FullCalendar
              key={isMobile ? "m" : "d"}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView={isMobile ? "listWeek" : "dayGridMonth"}
              timeZone="Asia/Jakarta"
              eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
              slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
              views={{ dayGridMonth: { dayMaxEvents: 3 } }}
              headerToolbar={
                isMobile
                  ? { left: "prev,next", center: "title", right: "today,dayGridMonth,listWeek" }
                  : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }
              }
              buttonText={
                isMobile
                  ? { today: "Today", month: "Month", week: "Week", day: "Day" }
                  : undefined
              }
              datesSet={(arg) => setViewType(arg.view.type)}
              eventContent={(arg) => {
                const b = arg.event.extendedProps.booking as any
                const venueName = b?.venueId && Array.isArray(venues) ? (venues.find((v) => v.id === b.venueId)?.name || "") : ""
                const guest = b?.guestName ?? arg.event.title
                if (viewType === "dayGridMonth") {
                  return (
                    <div className="text-[11px] leading-tight truncate">
                      <span className="font-medium">{guest}</span>
                      {venueName ? (
                        <span className="text-muted-foreground">{' \u2022 '}{venueName}</span>
                      ) : null}
                    </div>
                  )
                }
                if (isMobile && viewType === "listWeek") {
                  const activityName = b?.activityId && Array.isArray(activities)
                    ? (activities.find((a: any) => a.id === b.activityId)?.name || "")
                    : ""
                  return (
                    <div className="text-xs leading-tight min-w-0">
                      <div className="font-medium inline-flex items-center gap-1 min-w-0">
                        <User className="h-3.5 w-3.5 opacity-70" />
                        <span className="truncate">{guest}</span>
                        {b?.suiteNumber ? (
                          <span className="ml-1 text-muted-foreground shrink-0">({b.suiteNumber})</span>
                        ) : null}
                      </div>
                      {activityName ? (
                        <div className="text-muted-foreground truncate max-w-full flex items-center gap-1">
                          <ActivityIcon className="h-3.5 w-3.5 opacity-70" />
                          <span className="truncate">{activityName}</span>
                        </div>
                      ) : null}
                      {venueName ? (
                        <div className="text-muted-foreground truncate max-w-full flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 opacity-70" />
                          <span className="truncate">{venueName}</span>
                        </div>
                      ) : null}
                    </div>
                  )
                }
                return (
                  <div className="text-xs sm:text-sm">
                    <span className="font-medium">{arg.timeText}</span>
                    <span className="mx-1">{' \u2022 '}</span>
                    <span>{guest}</span>
                    {venueName ? (
                      <>
                        <span className="mx-1">{' \u2022 '}</span>
                        <span className="text-muted-foreground">{venueName}</span>
                      </>
                    ) : null}
                  </div>
                )
              }}
              events={calendarEvents}
              eventClick={handleEventClick}
              select={handleDateSelect}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              height="auto"
              slotMinTime="06:00:00"
              slotMaxTime="23:00:00"
            />
            )}
          </div>
        </CardContent>
      </Card>

      <BookingDrawer
        booking={selectedBooking}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedBooking(null)
        }}
      />

      <CreateBookingDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultDate={selectedDate}
        defaultTime={selectedTime}
      />
    </div>
  )
}

export default function CalendarPage() {
  return (
    <NavLayout>
      <CalendarContent />
    </NavLayout>
  )
}
