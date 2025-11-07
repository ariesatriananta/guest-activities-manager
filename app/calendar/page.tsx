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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { DateField } from "@/components/ui/date-field"
import { formatDateISOInTZ, JAKARTA_TZ } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FilterX } from "lucide-react"
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
  const [filtersOpen, setFiltersOpen] = useState(false)

  const { data: bookings } = useBookings()
  const { data: categories } = useCategories()
  const { data: activities } = useActivities()
  const { data: venues } = useVenues()

  const filteredBookings = useMemo(() => {
    if (!bookings) return []

    const activityToCategory = new Map<string, string>()
    activities?.forEach((a) => activityToCategory.set(a.id, a.categoryId))

    return bookings.filter((booking) => {
      if (booking.status === "cancelled") return false
      if (dateFrom && booking.date < dateFrom) return false
      if (dateTo && booking.date > dateTo) return false
      if (venueFilter !== "all" && booking.venueId !== venueFilter) return false
      if (categoryFilter !== "all") {
        const catId = activityToCategory.get(booking.activityId)
        if (catId !== categoryFilter) return false
      }
      return true
    })
  }, [bookings, dateFrom, dateTo, venueFilter, categoryFilter, activities])

  const calendarEvents = useMemo(() => {
    if (!filteredBookings || !categories) return []

    return filteredBookings.map((booking) => {
      let color = "#3b82f6"

      if (booking.activityId.includes("din")) {
        color = "#f59e0b"
      } else if (booking.activityId.includes("spi")) {
        color = "#8b5cf6"
      } else {
        color = "#10b981"
      }

      return {
        id: booking.id,
        title: booking.guestName,
        start: `${booking.date}T${booking.startTime}`,
        end: `${booking.date}T${booking.endTime}`,
        backgroundColor: color,
        borderColor: color,
        extendedProps: {
          booking,
        },
      }
    })
  }, [filteredBookings, categories])

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
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Calendar</h2>
        <p className="text-muted-foreground">View and manage bookings in calendar format</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters</CardTitle>
            <div className="sm:hidden flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setFiltersOpen((v) => !v)}>
                {filtersOpen ? "Hide" : "Show"}
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Clear Filters"
                onClick={() => { setCategoryFilter("all"); setVenueFilter("all"); setDateFrom(""); setDateTo("") }}
              >
                <FilterX className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={"grid grid-cols-1 md:grid-cols-4 gap-2 sm:gap-4 " + (filtersOpen ? "" : "max-sm:hidden") }>
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Venue</label>
              <Select value={venueFilter} onValueChange={setVenueFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All venues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All venues</SelectItem>
                  {venues?.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date From</label>
              <DateField value={dateFrom} onChange={setDateFrom} />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date To</label>
              <DateField value={dateTo} onChange={setDateTo} />
            </div>
          </div>

          <Button
            variant="outline"
            className="mt-4 bg-transparent hidden sm:inline-flex"
            onClick={() => {
              setCategoryFilter("all")
              setVenueFilter("all")
              setDateFrom("")
              setDateTo("")
            }}
          >
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="calendar-container">
            <FullCalendar
              key={isMobile ? "m" : "d"}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView={isMobile ? "listWeek" : "dayGridMonth"}
              timeZone="Asia/Jakarta"
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
              eventContent={(arg) => {
                const b = arg.event.extendedProps.booking as any
                const venueName = b?.venueId && Array.isArray(venues) ? (venues.find((v) => v.id === b.venueId)?.name || "") : ""
                return (
                  <div className="text-xs sm:text-sm">
                    <span className="font-medium">{arg.timeText}</span>
                    <span className="mx-1">{' \u2022 '}</span>
                    <span>{b?.guestName ?? arg.event.title}</span>
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
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "#10b981" }} />
          <span className="text-sm">Activities</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "#f59e0b" }} />
          <span className="text-sm">Special Dining</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "#8b5cf6" }} />
          <span className="text-sm">Spiritual</span>
        </div>
      </div>

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

