"use client"

import { useBookings } from "@/lib/hooks/useBookings"
import { useActivities, useCategories } from "@/lib/hooks/useActivities"
import { useVenues } from "@/lib/hooks/useVenues"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FilterX, RefreshCcw, Loader2 } from "lucide-react"
import { Download } from "lucide-react"
import { NavLayout } from "@/components/layout/nav-layout"
import { useMemo, useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { DateField } from "@/components/ui/date-field"
import { ReportsFiltersSheet } from "@/components/features/reports/filters-sheet"

function ReportsContent() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  const { data: bookings, isLoading: loadingBookings, mutate: mutateBookings } = useBookings()
  const { data: activities, isLoading: loadingActivities, refetch: refetchActivities } = useActivities()
  const { data: categories, isLoading: loadingCategories, refetch: refetchCategories } = useCategories()
  const { data: venues, isLoading: loadingVenues, refetch: refetchVenues } = useVenues()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)")
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  // Load from URL once
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const from = sp.get("from") || ""
    const to = sp.get("to") || ""
    if (from) setDateFrom(from)
    if (to) setDateTo(to)
  }, [])

  // Sync to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (dateFrom) params.set("from", dateFrom)
    if (dateTo) params.set("to", dateTo)
    const qs = params.toString()
    const url = qs ? `?${qs}` : ""
    history.replaceState(null, "", `/reports${url}`)
  }, [dateFrom, dateTo])

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (dateFrom) n++
    if (dateTo) n++
    return n
  }, [dateFrom, dateTo])

  const filteredBookings = useMemo(() => {
    if (!bookings) return []
    return bookings.filter((booking) => {
      if (booking.status === "cancelled") return false
      if (dateFrom && booking.date < dateFrom) return false
      if (dateTo && booking.date > dateTo) return false
      return true
    })
  }, [bookings, dateFrom, dateTo])

  // Bookings by Category
  const bookingsByCategory = useMemo(() => {
    if (!filteredBookings || !activities || !categories) return []

    const categoryMap = new Map<string, number>()

    filteredBookings.forEach((booking) => {
      const activity = activities.find((a) => a.id === booking.activityId)
      if (activity) {
        const category = categories.find((c) => c.id === activity.categoryId)
        if (category) {
          categoryMap.set(category.name, (categoryMap.get(category.name) || 0) + 1)
        }
      }
    })

    return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }))
  }, [filteredBookings, activities, categories])

  // Bookings by Venue
  const bookingsByVenue = useMemo(() => {
    if (!filteredBookings || !venues) return []

    const venueMap = new Map<string, number>()

    filteredBookings.forEach((booking) => {
      const venue = venues.find((v) => v.id === booking.venueId)
      if (venue) {
        venueMap.set(venue.name, (venueMap.get(venue.name) || 0) + 1)
      }
    })

    return Array.from(venueMap.entries())
      .map(([name, bookings]) => ({ name, bookings }))
      .sort((a, b) => b.bookings - a.bookings)
  }, [filteredBookings, venues])

  // Bookings by Activity
  const bookingsByActivity = useMemo(() => {
    if (!filteredBookings || !activities) return []

    const activityMap = new Map<string, number>()

    filteredBookings.forEach((booking) => {
      const activity = activities.find((a) => a.id === booking.activityId)
      if (activity) {
        activityMap.set(activity.name, (activityMap.get(activity.name) || 0) + 1)
      }
    })

    return Array.from(activityMap.entries())
      .map(([name, bookings]) => ({ name, bookings }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 10)
  }, [filteredBookings, activities])

  // Monthly Trend
  const monthlyTrend = useMemo(() => {
    if (!bookings) return []

    const monthMap = new Map<string, { confirmed: number; tentative: number; cancelled: number; done: number }>()

    bookings.forEach((booking) => {
      const month = booking.date.slice(0, 7)
      const current = monthMap.get(month) || { confirmed: 0, tentative: 0, cancelled: 0, done: 0 }

      if (booking.status === "confirmed") current.confirmed++
      else if (booking.status === "tentative") current.tentative++
      else if (booking.status === "cancelled") current.cancelled++
      else if (booking.status === "done") current.done++

      monthMap.set(month, current)
    })

    return Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        confirmed: data.confirmed,
        tentative: data.tentative,
        cancelled: data.cancelled,
        done: data.done,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
  }, [bookings])

  // Guest Capacity Utilization
  const capacityData = useMemo(() => {
    if (!filteredBookings) return []

    const paxRanges = [
      { range: "1-2", min: 1, max: 2, count: 0 },
      { range: "3-5", min: 3, max: 5, count: 0 },
      { range: "6-10", min: 6, max: 10, count: 0 },
      { range: "11+", min: 11, max: Number.POSITIVE_INFINITY, count: 0 },
    ]

    filteredBookings.forEach((booking) => {
      const range = paxRanges.find((r) => booking.pax >= r.min && booking.pax <= r.max)
      if (range) range.count++
    })

    return paxRanges.map(({ range, count }) => ({ range, count }))
  }, [filteredBookings])

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"]
  const isLoadingAny = loadingBookings || loadingActivities || loadingCategories || loadingVenues

  const chartClass = isMobile ? "h-[260px] aspect-auto" : "h-[300px]"
  const trendChartClass = isMobile ? "h-[320px] aspect-auto" : "h-[400px]"
  const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s)

  const exportReport = () => {
    try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
    const report = {
      generatedAt: new Date().toISOString(),
      dateRange: { from: dateFrom || "all", to: dateTo || "all" },
      totalBookings: filteredBookings.length,
      bookingsByCategory,
      bookingsByVenue,
      bookingsByActivity,
      monthlyTrend,
      capacityData,
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `report-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {}
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
    try {
      await Promise.all([
        mutateBookings(),
        refetchActivities(),
        refetchCategories(),
        refetchVenues(),
      ])
    } finally {
      setRefreshing(false)
      try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {}
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Reports & Analytics</h2>
          <p className="text-muted-foreground">View booking statistics and trends</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} size="icon-sm" variant="outline" aria-label="Refresh" disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          </Button>
          <Button onClick={exportReport} size="icon-sm" variant="outline" aria-label="Export Report">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Toolbar: filters sheet + clear */}
      <div className="flex items-center gap-2 flex-wrap">
        <ReportsFiltersSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          values={{ dateFrom, dateTo }}
          onApply={(v) => { setDateFrom(v.dateFrom || ""); setDateTo(v.dateTo || "") }}
          activeCount={activeFilterCount}
        />
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Clear Filters"
          onClick={() => { setDateFrom(""); setDateTo("") }}
        >
          <FilterX className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Category</CardTitle>
            <CardDescription>Distribution of bookings across activity categories</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAny ? (
              <Skeleton className={chartClass} />
            ) : (
            <ChartContainer
              config={{
                value: {
                  label: "Bookings",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className={chartClass}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bookingsByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={isMobile ? 70 : 80}
                    label={!isMobile}
                  >
                    {bookingsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {!isMobile && <Legend />}
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Bookings by Venue */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Venue</CardTitle>
            <CardDescription>Most popular venues</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAny ? (
              <Skeleton className={chartClass} />
            ) : (
            <ChartContainer
              config={{
                bookings: {
                  label: "Bookings",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className={chartClass}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingsByVenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={isMobile ? 0 : -45}
                    textAnchor={isMobile ? "middle" : "end"}
                    height={isMobile ? 50 : 100}
                    tickFormatter={(v: string) => (isMobile ? truncate(v, 10) : v)}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="bookings" fill="var(--color-bookings)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Activities</CardTitle>
            <CardDescription>Most booked activities</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAny ? (
              <Skeleton className={chartClass} />
            ) : (
            <ChartContainer
              config={{
                bookings: {
                  label: "Bookings",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className={chartClass}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingsByActivity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={isMobile ? 110 : 150}
                    tickFormatter={(v: string) => (isMobile ? truncate(v, 14) : v)}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="bookings" fill="var(--color-bookings)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Guest Capacity */}
        <Card>
          <CardHeader>
            <CardTitle>Guest Capacity Distribution</CardTitle>
            <CardDescription>Bookings by party size</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAny ? (
              <Skeleton className={chartClass} />
            ) : (
            <ChartContainer
              config={{
                count: {
                  label: "Bookings",
                  color: "hsl(var(--chart-4))",
                },
              }}
              className={chartClass}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={capacityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Booking Trend</CardTitle>
          <CardDescription>Booking status trends over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAny ? (
            <Skeleton className={trendChartClass} />
          ) : (
          <ChartContainer
            config={{
              confirmed: {
                label: "Confirmed",
                color: "hsl(var(--chart-1))",
              },
              tentative: {
                label: "Tentative",
                color: "hsl(var(--chart-3))",
              },
              cancelled: {
                label: "Cancelled",
                color: "hsl(var(--chart-5))",
              },
              done: {
                label: "Done",
                color: "hsl(var(--chart-4))",
              },
            }}
            className={trendChartClass}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                {!isMobile && <Legend />}
                <Line type="monotone" dataKey="confirmed" stroke="var(--color-confirmed)" strokeWidth={2} />
                <Line type="monotone" dataKey="tentative" stroke="var(--color-tentative)" strokeWidth={2} />
                <Line type="monotone" dataKey="cancelled" stroke="var(--color-cancelled)" strokeWidth={2} />
                <Line type="monotone" dataKey="done" stroke="var(--color-done)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Summary Statistics</CardTitle>
          <CardDescription>Key metrics for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-accent/50">
              <p className="text-sm text-muted-foreground">Total Bookings</p>
              <p className="text-2xl font-bold">{filteredBookings.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-accent/50">
              <p className="text-sm text-muted-foreground">Total Guests</p>
              <p className="text-2xl font-bold">{filteredBookings.reduce((sum, b) => sum + b.pax, 0)}</p>
            </div>
            <div className="p-4 rounded-lg bg-accent/50">
              <p className="text-sm text-muted-foreground">Avg Party Size</p>
              <p className="text-2xl font-bold">
                {filteredBookings.length > 0
                  ? (filteredBookings.reduce((sum, b) => sum + b.pax, 0) / filteredBookings.length).toFixed(1)
                  : 0}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-accent/50">
              <p className="text-sm text-muted-foreground">Unique Venues</p>
              <p className="text-2xl font-bold">{new Set(filteredBookings.map((b) => b.venueId)).size}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <NavLayout>
      <ReportsContent />
    </NavLayout>
  )
}
