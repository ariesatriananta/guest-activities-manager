"use client"

import { useBookings } from "@/lib/hooks/useBookings"
import { useActivities, useCategories } from "@/lib/hooks/useActivities"
import { useVenues } from "@/lib/hooks/useVenues"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FilterX, RefreshCcw, Loader2, Download } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NavLayout } from "@/components/layout/nav-layout"
import { useMemo, useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "next-auth/react"
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
  const { data: session } = useSession()
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
    return bookings
      .filter((booking) => {
        if (booking.status === "cancelled") return false
        if (dateFrom && booking.date < dateFrom) return false
        if (dateTo && booking.date > dateTo) return false
        return true
      })
      .slice()
      .sort((a, b) => {
        if (a.date !== b.date) return a.date > b.date ? -1 : 1 // Tanggal desc
        const ta = a.startTime || "00:00"
        const tb = b.startTime || "00:00"
        return ta.localeCompare(tb) // Jam asc
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

  const statusColors = {
    confirmed: { fill: [16, 185, 129], text: [0, 74, 50] },
    tentative: { fill: [245, 158, 11], text: [117, 74, 0] },
    cancelled: { fill: [239, 68, 68], text: [104, 0, 12] },
    done: { fill: [56, 189, 248], text: [0, 76, 122] },
  } as const

  const fetchLogoDataUrl = async (path: string) => {
    try {
      const res = await fetch(path)
      const blob = await res.blob()
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch {
      return ""
    }
  }

  const exportToXLS = () => {
    if (!filteredBookings || !venues) return

    const headers = [
      "Date",
      "Time",
      "Guest Name",
      "Suite",
      "Pax",
      "Activities",
      "Venue",
      "GA name",
      "Driver/Therapist name",
      "Bill",
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
        b.bill || "",
        b.remark || "",
        b.status,
      ]
    })

    const cols = headers.map(() => `<Column ss:AutoFitWidth="1" />`).join("")
    const rowsXml = [
      `<Row>${headers.map((h) => `<Cell><Data ss:Type="String">${esc(h)}</Data></Cell>`).join("")}</Row>`,
      ...rows.map(
        (r) =>
          `<Row>${r
            .map((c) => `<Cell><Data ss:Type="String">${esc(c)}</Data></Cell>`)
            .join("")}</Row>`,
      ),
    ].join("")

    const xml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Bookings">
    <Table>
      ${cols}
      ${rowsXml}
    </Table>
  </Worksheet>
</Workbook>`

    const blob = new Blob([xml], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bookings-${new Date().toISOString().split("T")[0]}.xlsx`
    try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
    a.click()
    try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {}
  }
  const exportToPDF = () => {
    const doExport = async () => {
      if (!filteredBookings || !venues) return
      try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
      try {
        const { default: jsPDF } = await import("jspdf")
        const autoTable = (await import("jspdf-autotable")).default
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
        const pageWidth = doc.internal.pageSize.getWidth()
        const generatedAt = new Date()
        const generatedBy = session?.user?.name || "System"
        const formatDateTime = (iso?: string | null) => {
          if (!iso) return "-"
          const d = new Date(iso)
          return d.toLocaleString("en-GB")
        }

        // Header with logo
        const logo = await fetchLogoDataUrl("/logo/logo-main.png")

        const headers = [
          "Date",
          "Time",
          "Guest",
          "Suite",
          "Pax",
          "Activities",
          "Venue",
          "GA name",
          "Driver/Therapist name",
          "Bill",
          "Remark",
          "Status",
        ]

        const activityMap = new Map<string, string>()
        activities?.forEach((a) => activityMap.set(a.id, a.name))
        const venueMap = new Map<string, string>()
        venues?.forEach((v) => venueMap.set(v.id, v.name))

        const body = filteredBookings.map((b) => {
          const [y, m, d] = (b.date || "").split("-")
          const date = d && m && y ? `${d}/${m}/${y}` : b.date
          const time = `${b.startTime}${b.endTime ? ` - ${b.endTime}` : ""}`
          const activityName = activityMap.get(b.activityId) || ""
          const venueName = venueMap.get(b.venueId) || ""
          const statusStyle = statusColors[b.status as keyof typeof statusColors] || statusColors.confirmed
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
            b.bill || "",
            b.remark || "",
            {
              content: b.status,
              styles: {
                fillColor: statusStyle.fill,
                textColor: statusStyle.text,
                fontStyle: "bold",
                halign: "center",
                overflow: "visible",
                cellWidth: 18,
                lineColor: [255, 255, 255],
                lineWidth: 0.6,
              },
            },
          ]
        })

        const drawHeader = () => {
          if (logo) {
            doc.addImage(logo, "PNG", 8, 12, 48, 12, undefined, "FAST")
          }
          doc.setFontSize(13)
          doc.text("Bookings Report", pageWidth - 12, 16, { align: "right" })
          doc.setFontSize(10)
          doc.text(`Generated by ${generatedBy}`, pageWidth - 12, 21, { align: "right" })
          doc.text(`Generated at ${generatedAt.toLocaleString("en-GB")}`, pageWidth - 12, 26, { align: "right" })
        }

        drawHeader()

        ;(autoTable as any)(doc, {
          head: [headers],
          body,
          startY: 32,
          margin: { top: 32, left: 8, right: 8 },
          tableWidth: pageWidth - 16,
          styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
          headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
          columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 22 },
            2: { cellWidth: 32 },
            3: { cellWidth: 16 },
            4: { cellWidth: 12 },
            5: { cellWidth: 36 },
            6: { cellWidth: 32 },
            7: { cellWidth: 28 },
            8: { cellWidth: 28 },
            9: { cellWidth: 24 },
            10: { cellWidth: 36 },
            11: { cellWidth: 18},
          },
          didDrawPage: (data: any) => {
            const pageHeight = doc.internal.pageSize.getHeight()
            const pageNumber = doc.internal.getNumberOfPages()
            drawHeader()
            doc.setFontSize(8)
            doc.text(`Page ${data.pageNumber} / ${pageNumber}`, pageWidth - 24, pageHeight - 8)
          },
        })

        doc.save(`bookings-${generatedAt.toISOString().split("T")[0]}.pdf`)
      } catch (err) {
        console.error("[reports] Failed to export PDF", err)
      } finally {
        try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {}
      }
    }
    doExport()
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="outline" aria-label="Export">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToXLS}>Export Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>Export PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
