"use client"

import { useBookings } from "@/lib/hooks/useBookings"
import { useActivities, useCategories } from "@/lib/hooks/useActivities"
import { useVenues } from "@/lib/hooks/useVenues"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { NavLayout } from "@/components/layout/nav-layout"
import { useMemo, useState } from "react"
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

function ReportsContent() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  const { data: bookings } = useBookings()
  const { data: activities } = useActivities()
  const { data: categories } = useCategories()
  const { data: venues } = useVenues()

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

    const monthMap = new Map<string, { confirmed: number; draft: number; cancelled: number }>()

    bookings.forEach((booking) => {
      const month = booking.date.slice(0, 7)
      const current = monthMap.get(month) || { confirmed: 0, draft: 0, cancelled: 0 }

      if (booking.status === "confirmed") current.confirmed++
      else if (booking.status === "draft") current.draft++
      else if (booking.status === "cancelled") current.cancelled++

      monthMap.set(month, current)
    })

    return Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        confirmed: data.confirmed,
        draft: data.draft,
        cancelled: data.cancelled,
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

  const exportReport = () => {
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
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Reports & Analytics</h2>
          <p className="text-muted-foreground">View booking statistics and trends</p>
        </div>
        <Button onClick={exportReport}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date Range Filter</CardTitle>
          <CardDescription>Filter reports by date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date From</label>
              <DateField value={dateFrom} onChange={setDateFrom} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Date To</label>
              <DateField value={dateTo} onChange={setDateTo} />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setDateFrom("")
                  setDateTo("")
                }}
              >
                Clear Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Category</CardTitle>
            <CardDescription>Distribution of bookings across activity categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: {
                  label: "Bookings",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bookingsByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {bookingsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Bookings by Venue */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Venue</CardTitle>
            <CardDescription>Most popular venues</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                bookings: {
                  label: "Bookings",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingsByVenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="bookings" fill="var(--color-bookings)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Activities</CardTitle>
            <CardDescription>Most booked activities</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                bookings: {
                  label: "Bookings",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingsByActivity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="bookings" fill="var(--color-bookings)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Guest Capacity */}
        <Card>
          <CardHeader>
            <CardTitle>Guest Capacity Distribution</CardTitle>
            <CardDescription>Bookings by party size</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Bookings",
                  color: "hsl(var(--chart-4))",
                },
              }}
              className="h-[300px]"
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
          <ChartContainer
            config={{
              confirmed: {
                label: "Confirmed",
                color: "hsl(var(--chart-1))",
              },
              draft: {
                label: "Draft",
                color: "hsl(var(--chart-3))",
              },
              cancelled: {
                label: "Cancelled",
                color: "hsl(var(--chart-5))",
              },
            }}
            className="h-[400px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line type="monotone" dataKey="confirmed" stroke="var(--color-confirmed)" strokeWidth={2} />
                <Line type="monotone" dataKey="draft" stroke="var(--color-draft)" strokeWidth={2} />
                <Line type="monotone" dataKey="cancelled" stroke="var(--color-cancelled)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
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
