"use client"

import { useState, useMemo } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import type { EventClickArg, DateSelectArg } from "@fullcalendar/core"
import { useBookings } from "@/lib/hooks/useBookings"
import { useCategories } from "@/lib/hooks/useActivities"
import { useVenues } from "@/lib/hooks/useVenues"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarCmp } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatDateISOInTZ, JAKARTA_TZ } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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

  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [venueFilter, setVenueFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const { data: bookings } = useBookings()
  const { data: categories } = useCategories()
  const { data: venues } = useVenues()

  const filteredBookings = useMemo(() => {
    if (!bookings) return []

    return bookings.filter((booking) => {
      if (booking.status === "cancelled") return false
      if (dateFrom && booking.date < dateFrom) return false
      if (dateTo && booking.date > dateTo) return false
      if (venueFilter !== "all" && booking.venueId !== venueFilter) return false
      return true
    })
  }, [bookings, dateFrom, dateTo, venueFilter])

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
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Calendar</h2>
        <p className="text-muted-foreground">View and manage bookings in calendar format</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter calendar events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div className="hidden md:block">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full bg-transparent justify-start">
                      {dateFrom || "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start">
                    <CalendarCmp
                      mode="single"
                      selected={dateFrom ? new Date(dateFrom) : undefined}
                      onSelect={(d) => setDateFrom(d ? formatDateISOInTZ(d, JAKARTA_TZ) : "")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="md:hidden">
                <MobileDatePicker value={dateFrom} onChange={setDateFrom} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date To</label>
              <div className="hidden md:block">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full bg-transparent justify-start">
                      {dateTo || "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start">
                    <CalendarCmp
                      mode="single"
                      selected={dateTo ? new Date(dateTo) : undefined}
                      onSelect={(d) => setDateTo(d ? formatDateISOInTZ(d, JAKARTA_TZ) : "")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="md:hidden">
                <MobileDatePicker value={dateTo} onChange={setDateTo} />
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="mt-4 bg-transparent"
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
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              timeZone="Asia/Jakarta"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
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

function MobileDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => setOpen(true)}>
        {value || "Pick a date"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-full h-[90vh] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Date</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <CalendarCmp
              mode="single"
              selected={value ? new Date(value) : undefined}
              onSelect={(d) => { if (d) { onChange(formatDateISOInTZ(d, JAKARTA_TZ)); setOpen(false) } }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
