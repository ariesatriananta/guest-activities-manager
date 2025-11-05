"use client"

import { useBookings } from "@/lib/hooks/useBookings"
import { useCategories } from "@/lib/hooks/useActivities"
import { useVenues } from "@/lib/hooks/useVenues"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarCmp } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatDateISOInTZ, JAKARTA_TZ } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Eye } from "lucide-react"
import Link from "next/link"
import { useState, useMemo } from "react"
import { NavLayout } from "@/components/layout/nav-layout"
import type { BookingStatus } from "@/lib/types"

function BookingsContent() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [venueFilter, setVenueFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all")

  const { data: bookings, isLoading } = useBookings()
  const { data: categories } = useCategories()
  const { data: venues } = useVenues()

  const filteredBookings = useMemo(() => {
    if (!bookings) return []

    return bookings.filter((booking) => {
      if (dateFrom && booking.date < dateFrom) return false
      if (dateTo && booking.date > dateTo) return false
      if (venueFilter !== "all" && booking.venueId !== venueFilter) return false
      if (statusFilter !== "all" && booking.status !== statusFilter) return false

      if (categoryFilter !== "all") {
        return true
      }

      return true
    })
  }, [bookings, dateFrom, dateTo, venueFilter, categoryFilter, statusFilter])

  const exportToCSV = () => {
    if (!filteredBookings || !venues) return

    const headers = ["Date", "Time", "Guest", "Suite", "Pax", "Venue", "Status"]
    const rows = filteredBookings.map((booking) => {
      const venue = venues.find((v) => v.id === booking.venueId)
      return [
        booking.date,
        `${booking.startTime}-${booking.endTime}`,
        booking.guestName,
        booking.suiteNumber,
        booking.pax.toString(),
        venue?.name || "",
        booking.status,
      ]
    })

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bookings-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

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

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Bookings</h2>
        <p className="text-muted-foreground">Manage guest activity bookings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter bookings by date, venue, category, or status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BookingStatus | "all")}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDateFrom("")
                setDateTo("")
                setVenueFilter("all")
                setCategoryFilter("all")
                setStatusFilter("all")
              }}
            >
              Clear Filters
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>{filteredBookings?.length || 0} booking(s) found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Suite</TableHead>
                  <TableHead>Pax</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredBookings?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No bookings found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings?.map((booking) => {
                    const venue = venues?.find((v) => v.id === booking.venueId)
                    return (
                      <TableRow key={booking.id}>
                        <TableCell>{booking.date}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {booking.startTime} - {booking.endTime}
                        </TableCell>
                        <TableCell>{booking.guestName}</TableCell>
                        <TableCell>{booking.suiteNumber}</TableCell>
                        <TableCell>{booking.pax}</TableCell>
                        <TableCell>{venue?.name}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(booking.status)}>{booking.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/bookings/${booking.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function BookingsPage() {
  return (
    <NavLayout>
      <BookingsContent />
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
