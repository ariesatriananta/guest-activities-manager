"use client"

import { useBookings } from "@/lib/hooks/useBookings"
import { useActivities, useCategories } from "@/lib/hooks/useActivities"
import { useVenues } from "@/lib/hooks/useVenues"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Eye, Edit, FilterX, Loader2, RefreshCcw } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FiltersSheet } from "@/components/features/bookings/filters-sheet"
import { useMemo, useState, useEffect } from "react"
import { NavLayout } from "@/components/layout/nav-layout"
import type { BookingStatus, Booking } from "@/lib/types"
import { BookingDrawer } from "@/components/features/bookings/booking-drawer"

function BookingsContent() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [venueFilter, setVenueFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [navigatingId, setNavigatingId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [visibleCount, setVisibleCount] = useState(20)
  const { data: bookings, isLoading, mutate } = useBookings()
  const { data: categories } = useCategories()
  const { data: activities } = useActivities()
  const { data: venues } = useVenues()
  const router = useRouter()
  const searchParams = useSearchParams()

  const goTo = (id: string) => {
    setNavigatingId(id)
    router.push(`/bookings/${id}`)
  }
  const openView = (booking: Booking) => {
    setSelectedBooking(booking)
    setDrawerOpen(true)
  }

  const filteredBookings = useMemo(() => {
    if (!bookings) return []

    const venueMap = new Map<string, string>()
    venues?.forEach((v) => venueMap.set(v.id, v.name))
    const activityToCategory = new Map<string, string>()
    activities?.forEach((a) => activityToCategory.set(a.id, a.categoryId))
    const q = search.trim().toLowerCase()

    return bookings.filter((booking) => {
      if (dateFrom && booking.date < dateFrom) return false
      if (dateTo && booking.date > dateTo) return false
      if (venueFilter !== "all" && booking.venueId !== venueFilter) return false
      if (statusFilter !== "all" && booking.status !== statusFilter) return false

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
  }, [bookings, dateFrom, dateTo, venueFilter, categoryFilter, statusFilter, venues, search, activities])

  const visibleBookings = useMemo(() => {
    return (filteredBookings || []).slice(0, visibleCount)
  }, [filteredBookings, visibleCount])

  // Derive active filter count for badge
  const activeFilterCount = useMemo(() => {
    let n = 0
    if (search.trim()) n++
    if (dateFrom) n++
    if (dateTo) n++
    if (venueFilter !== "all") n++
    if (categoryFilter !== "all") n++
    if (statusFilter !== "all") n++
    return n
  }, [search, dateFrom, dateTo, venueFilter, categoryFilter, statusFilter])

  // Load filters from URL once on mount
  useEffect(() => {
    const q = searchParams.get("q") || ""
    const from = searchParams.get("from") || ""
    const to = searchParams.get("to") || ""
    const venue = searchParams.get("venue") || "all"
    const cat = searchParams.get("cat") || "all"
    const status = (searchParams.get("status") as BookingStatus | null) || null
    if (q) setSearch(q)
    if (from) setDateFrom(from)
    if (to) setDateTo(to)
    if (venue) setVenueFilter(venue)
    if (cat) setCategoryFilter(cat)
    if (status) setStatusFilter(status)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync filters to URL (shallow)
  useEffect(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set("q", search.trim())
    if (dateFrom) params.set("from", dateFrom)
    if (dateTo) params.set("to", dateTo)
    if (venueFilter !== "all") params.set("venue", venueFilter)
    if (categoryFilter !== "all") params.set("cat", categoryFilter)
    if (statusFilter !== "all") params.set("status", statusFilter)
    const qs = params.toString()
    const url = qs ? `?${qs}` : ""
    router.replace(`/bookings${url}`, { scroll: false })
    setVisibleCount(20)
  }, [search, dateFrom, dateTo, venueFilter, categoryFilter, statusFilter, router])

  const exportToXLS = () => {
    if (!filteredBookings || !venues) return

    const headers = [
      "Date",
      "Time",
      "Guest",
      "Suite",
      "Pax",
      "Activities",
      "Venue",
      "GA name",
      "Driver name",
      "Remark",
      "Status",
    ]

    const activityMap = new Map<string, string>()
    activities?.forEach((a) => activityMap.set(a.id, a.name))
    const venueMap = new Map<string, string>()
    venues?.forEach((v) => venueMap.set(v.id, v.name))

    const esc = (s: any) =>
      String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

    const rows = filteredBookings.map((b) => {
      const [y, m, d] = (b.date || "").split("-")
      const date = d && m && y ? `${d}/${m}/${y}` : b.date
      const time = `${b.startTime}${b.endTime ? ` - ${b.endTime}` : ""}`
      const activityName = activityMap.get(b.activityId) || ""
      const venueName = venueMap.get(b.venueId) || ""
      return [
        date,
        time,
        b.guestName,
        b.suiteNumber,
        String(b.pax ?? ""),
        activityName,
        venueName,
        b.gaName || "",
        b.driverName || "",
        b.remark || "",
        b.status,
      ]
    })

    const thead = `<thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>`
    const tbody = `<tbody>${rows
      .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
      .join("")}</tbody>`
    const html = `<table>${thead}${tbody}</table>`

    const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bookings-${new Date().toISOString().split("T")[0]}.xls`
    try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
    a.click()
    try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {}
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
    try { await mutate() } finally { setRefreshing(false); try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {} }
  }

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case "confirmed":
        return "default"
      case "tentative":
        return "secondary"
      case "cancelled":
        return "destructive"
    }
  }

  const formatDateDDMMYYYY = (iso: string) => {
    const parts = iso.split("-")
    if (parts.length !== 3) return iso
    const [y, m, d] = parts
    return `${d}/${m}/${y}`
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Bookings</h2>
          <p className="text-muted-foreground">Manage guest activity bookings</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} size="icon-sm" variant="outline" aria-label="Refresh" disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          </Button>
          <Button onClick={exportToXLS} size="icon-sm" variant="outline" aria-label="Export Excel">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* One-line toolbar (all screens): search + filters (Sheet) + clear */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search guest / suite / venue"
          className="flex-1 min-w-[160px]"
        />
        <FiltersSheet
          open={filtersOpen}
          onOpenChange={(o) => setFiltersOpen(o)}
          values={{ dateFrom, dateTo, venueId: venueFilter, categoryId: categoryFilter, status: statusFilter }}
          onApply={(v) => { setDateFrom(v.dateFrom || ""); setDateTo(v.dateTo || ""); setVenueFilter(v.venueId); setCategoryFilter(v.categoryId); setStatusFilter(v.status); }}
          venues={venues || []}
          categories={categories || []}
          activeCount={activeFilterCount}
        />
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Clear Quick Filters"
          onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setVenueFilter("all"); setCategoryFilter("all"); setStatusFilter("all") }}
        >
          <FilterX className="h-4 w-4" />
        </Button>
      </div>

      {/* Desktop uses the same Sheet-based filters; card removed for consistency */}

      {/* Mobile list (compact) */}
      <Card className="sm:hidden">
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
          <CardDescription>{filteredBookings?.length || 0} booking(s) found</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <div className="flex flex-col items-end gap-1">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3 w-2/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : (filteredBookings?.length || 0) === 0 ? (
            <div className="text-center text-muted-foreground">No bookings found</div>
          ) : (
            <div className="space-y-3">
              {visibleBookings.map((booking) => {
                const venue = venues?.find((v) => v.id === booking.venueId)
                const activity = activities?.find((a) => a.id === booking.activityId)
                return (
                  <Link prefetch={false} href={`/bookings/${booking.id}`} onClick={(e) => { e.preventDefault(); goTo(booking.id) }} key={booking.id} className="block rounded-lg border border-border p-3 hover:bg-accent/50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{formatDateDDMMYYYY(booking.date)} </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <Badge variant={getStatusColor(booking.status)}>{booking.status}</Badge>
                        {navigatingId === booking.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <div className="text-xs text-muted-foreground whitespace-nowrap">{booking.startTime} - {booking.endTime}</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 text-sm">
                      <div className="font-medium truncate">
                        {booking.guestName}
                        <span className="mx-1">{" \u2022 "}</span>
                        <span className="text-xs text-muted-foreground">({booking.suiteNumber})</span>
                      </div>
                      <div className="text-muted-foreground truncate">{activity?.name} - {venue?.name}</div>
                    </div>
                  </Link>
                )
              })}
              <div className="pt-1 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Showing {visibleBookings.length} of {filteredBookings.length}</div>
                {visibleBookings.length < filteredBookings.length && (
                  <Button size="sm" variant="outline" onClick={() => setVisibleCount((c) => c + 20)}>Load more</Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Desktop table */}
          <Card className="hidden sm:block">
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
                  <TableHead>Activity</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="whitespace-nowrap"><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredBookings?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No bookings found
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleBookings?.map((booking) => {
                    const venue = venues?.find((v) => v.id === booking.venueId)
                    const activity = activities?.find((a) => a.id === booking.activityId)
                    return (
                      <TableRow key={booking.id}>
                        <TableCell>{formatDateDDMMYYYY(booking.date)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {booking.startTime} - {booking.endTime}
                        </TableCell>
                        <TableCell>{booking.guestName}</TableCell>
                        <TableCell>{booking.suiteNumber}</TableCell>
                        <TableCell>{booking.pax}</TableCell>
                        <TableCell>{activity?.name}</TableCell>
                        <TableCell>{venue?.name}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(booking.status)}>{booking.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openView(booking as Booking)} aria-label="View">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" asChild aria-label="Edit">
                              <Link prefetch={false} href={`/bookings/${booking.id}`} onClick={(e) => { e.preventDefault(); goTo(booking.id) }}>
                                {navigatingId === booking.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Edit className="h-4 w-4" />
                                )}
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Showing {visibleBookings.length} of {filteredBookings.length}</div>
            {visibleBookings.length < filteredBookings.length && (
              <Button size="sm" variant="outline" onClick={() => setVisibleCount((c) => c + 20)}>Load more</Button>
            )}
          </div>
        </CardContent>
      </Card>
      <BookingDrawer
        booking={selectedBooking}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedBooking(null) }}
      />
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









