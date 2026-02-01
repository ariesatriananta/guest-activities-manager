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
import { Eye, Edit, FilterX, Loader2, RefreshCcw, ChevronUp, ChevronDown } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FiltersSheet } from "@/components/features/bookings/filters-sheet"
import { useMemo, useState, useEffect } from "react"
import { NavLayout } from "@/components/layout/nav-layout"
import type { BookingStatus, Booking } from "@/lib/types"
import { BookingDrawer } from "@/components/features/bookings/booking-drawer"
import { useSession } from "next-auth/react"

function BookingsContent() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [venueFilter, setVenueFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [creatorFilter, setCreatorFilter] = useState<string>("all")
  const [navigatingId, setNavigatingId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [visibleCount, setVisibleCount] = useState(20)
  const [sortField, setSortField] = useState<"date" | "time" | "guest" | "suite" | "pax" | "activity" | "venue" | "status">("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const { data: bookings, isLoading, mutate } = useBookings()
  const { data: categories } = useCategories()
  const { data: activities } = useActivities()
  const { data: venues } = useVenues()
  const router = useRouter()
  const searchParams = useSearchParams()

  const getStatusBadgeClass = (status: BookingStatus) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-300"
      case "tentative":
        return "bg-amber-500/15 text-amber-700 border-amber-500/25 dark:text-amber-300"
      case "cancelled":
        return "bg-red-500/15 text-red-700 border-red-500/25 dark:text-red-300"
      case "done":
        return "bg-sky-500/15 text-sky-700 border-sky-500/25 dark:text-sky-300"
      default:
        return ""
    }
  }

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
      if (creatorFilter !== "all" && booking.createdById !== creatorFilter) return false

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
  }, [bookings, dateFrom, dateTo, venueFilter, categoryFilter, statusFilter, creatorFilter, venues, search, activities])

  const activityNameMap = useMemo(() => {
    const map = new Map<string, string>()
    activities?.forEach((a) => map.set(a.id, a.name))
    return map
  }, [activities])

  const venueNameMap = useMemo(() => {
    const map = new Map<string, string>()
    venues?.forEach((v) => map.set(v.id, v.name))
    return map
  }, [venues])

  const sortedBookings = useMemo(() => {
    const rows = (filteredBookings || []).slice()
    if (rows.length === 0) return rows

    const dir = sortDir === "asc" ? 1 : -1
    const compare = (a: Booking, b: Booking) => {
      switch (sortField) {
        case "date": {
          const dateCmp = a.date.localeCompare(b.date)
          if (dateCmp !== 0) return dir * dateCmp
          const timeCmp = a.startTime.localeCompare(b.startTime)
          return dir * timeCmp
        }
        case "time": {
          const timeCmp = a.startTime.localeCompare(b.startTime)
          return dir * timeCmp
        }
        case "guest": {
          const guestCmp = a.guestName.localeCompare(b.guestName, undefined, { sensitivity: "base" })
          return dir * guestCmp
        }
        case "suite": {
          const suiteCmp = String(a.suiteNumber || "").localeCompare(String(b.suiteNumber || ""), undefined, { numeric: true, sensitivity: "base" })
          return dir * suiteCmp
        }
        case "pax": {
          const paxCmp = (a.pax || 0) - (b.pax || 0)
          return dir * paxCmp
        }
        case "activity": {
          const an = activityNameMap.get(a.activityId) || ""
          const bn = activityNameMap.get(b.activityId) || ""
          const activityCmp = an.localeCompare(bn, undefined, { sensitivity: "base" })
          return dir * activityCmp
        }
        case "venue": {
          const an = venueNameMap.get(a.venueId) || ""
          const bn = venueNameMap.get(b.venueId) || ""
          const venueCmp = an.localeCompare(bn, undefined, { sensitivity: "base" })
          return dir * venueCmp
        }
        case "status": {
          const statusCmp = a.status.localeCompare(b.status)
          return dir * statusCmp
        }
        default:
          return 0
      }
    }

    return rows.sort(compare)
  }, [filteredBookings, sortField, sortDir, activityNameMap, venueNameMap])

  const creatorOptions = useMemo(() => {
    if (!bookings) return []
    const map = new Map<string, string>()
    bookings.forEach((b) => {
      if (b.createdById && b.createdByName) {
        map.set(b.createdById, b.createdByName)
      }
    })
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
  }, [bookings])

  const visibleBookings = useMemo(() => {
    return (sortedBookings || []).slice(0, visibleCount)
  }, [sortedBookings, visibleCount])

  // Derive active filter count for badge
  const activeFilterCount = useMemo(() => {
    let n = 0
    if (search.trim()) n++
    if (dateFrom) n++
    if (dateTo) n++
    if (venueFilter !== "all") n++
    if (categoryFilter !== "all") n++
    if (statusFilter !== "all") n++
    if (creatorFilter !== "all") n++
    return n
  }, [search, dateFrom, dateTo, venueFilter, categoryFilter, statusFilter, creatorFilter])

  // Load filters from URL once on mount
  useEffect(() => {
    const q = searchParams.get("q") || ""
    const from = searchParams.get("from") || ""
    const to = searchParams.get("to") || ""
    const venue = searchParams.get("venue") || "all"
    const cat = searchParams.get("cat") || "all"
    const status = (searchParams.get("status") as BookingStatus | null) || null
    const creator = searchParams.get("creator") || "all"
    if (q) setSearch(q)
    if (from) setDateFrom(from)
    if (to) setDateTo(to)
    if (venue) setVenueFilter(venue)
    if (cat) setCategoryFilter(cat)
    if (status) setStatusFilter(status)
    if (creator) setCreatorFilter(creator)
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
    if (creatorFilter !== "all") params.set("creator", creatorFilter)
    const qs = params.toString()
    const url = qs ? `?${qs}` : ""
    router.replace(`/bookings${url}`, { scroll: false })
    setVisibleCount(20)
  }, [search, dateFrom, dateTo, venueFilter, categoryFilter, statusFilter, creatorFilter, router])

  const handleSort = (field: "date" | "time" | "guest" | "suite" | "pax" | "activity" | "venue" | "status") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
      return
    }
    setSortField(field)
    setSortDir(field === "date" ? "desc" : "asc")
  }

  const renderSortIcon = (field: "date" | "time" | "guest" | "suite" | "pax" | "activity" | "venue" | "status") => {
    if (sortField !== field) return null
    return sortDir === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5" />
    )
  }

  const resetSort = () => {
    setSortField("date")
    setSortDir("desc")
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
    try { await mutate() } finally { setRefreshing(false); try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {} }
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
          values={{ dateFrom, dateTo, venueId: venueFilter, categoryId: categoryFilter, status: statusFilter, creatorId: creatorFilter }}
          onApply={(v) => {
            setDateFrom(v.dateFrom || "")
            setDateTo(v.dateTo || "")
            setVenueFilter(v.venueId)
            setCategoryFilter(v.categoryId)
            setStatusFilter(v.status)
            setCreatorFilter(v.creatorId)
          }}
          venues={venues || []}
          categories={categories || []}
          creators={creatorOptions}
          activeCount={activeFilterCount}
        />
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Clear Quick Filters"
          onClick={() => {
            setSearch("")
            setDateFrom("")
            setDateTo("")
            setVenueFilter("all")
            setCategoryFilter("all")
            setStatusFilter("all")
            setCreatorFilter("all")
          }}
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
                        <Badge variant="default" className={getStatusBadgeClass(booking.status)}>{booking.status}</Badge>
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
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>All Bookings</CardTitle>
              <CardDescription>{filteredBookings?.length || 0} booking(s) found</CardDescription>
            </div>
            {(sortField !== "date" || sortDir !== "desc") && (
              <Button size="sm" variant="ghost" onClick={resetSort}>Reset sort</Button>
            )}
          </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 ${sortField === "date" ? "text-primary font-semibold" : ""}`}
                      onClick={() => handleSort("date")}
                    >
                      Date {renderSortIcon("date")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 ${sortField === "time" ? "text-primary font-semibold" : ""}`}
                      onClick={() => handleSort("time")}
                    >
                      Time {renderSortIcon("time")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 ${sortField === "guest" ? "text-primary font-semibold" : ""}`}
                      onClick={() => handleSort("guest")}
                    >
                      Guest {renderSortIcon("guest")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 ${sortField === "suite" ? "text-primary font-semibold" : ""}`}
                      onClick={() => handleSort("suite")}
                    >
                      Suite {renderSortIcon("suite")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 ${sortField === "pax" ? "text-primary font-semibold" : ""}`}
                      onClick={() => handleSort("pax")}
                    >
                      Pax {renderSortIcon("pax")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 ${sortField === "activity" ? "text-primary font-semibold" : ""}`}
                      onClick={() => handleSort("activity")}
                    >
                      Activity {renderSortIcon("activity")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 ${sortField === "venue" ? "text-primary font-semibold" : ""}`}
                      onClick={() => handleSort("venue")}
                    >
                      Venue {renderSortIcon("venue")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 ${sortField === "status" ? "text-primary font-semibold" : ""}`}
                      onClick={() => handleSort("status")}
                    >
                      Status {renderSortIcon("status")}
                    </button>
                  </TableHead>
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
                          <Badge variant="default" className={getStatusBadgeClass(booking.status)}>{booking.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openView(booking as Booking)} aria-label="View">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {role !== "viewer" && (
                              <Button variant="ghost" size="sm" asChild aria-label="Edit">
                                <Link prefetch={false} href={`/bookings/${booking.id}`} onClick={(e) => { e.preventDefault(); goTo(booking.id) }}>
                                  {navigatingId === booking.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Edit className="h-4 w-4" />
                                  )}
                                </Link>
                              </Button>
                            )}
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









