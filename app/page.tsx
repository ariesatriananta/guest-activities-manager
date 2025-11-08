"use client"

import { useBookings } from "@/lib/hooks/useBookings"
import { useActivities } from "@/lib/hooks/useActivities"
import { useVenues } from "@/lib/hooks/useVenues"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Users, AlertTriangle, LayoutGrid, MapPin, User, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useEffect } from "react"
import { todayISOInJakarta } from "@/lib/utils"
import type { BookingStatus, Booking } from "@/lib/types"
import { BookingDrawer } from "@/components/features/bookings/booking-drawer"
import { NavLayout } from "@/components/layout/nav-layout"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  const router = useRouter()
  const { data: bookings, isLoading: loadingBookings } = useBookings()
  const { data: activities, isLoading: loadingActivities } = useActivities()
  const { data: venues, isLoading: loadingVenues } = useVenues()
  const isLoadingAny = loadingBookings || loadingActivities || loadingVenues

  const today = todayISOInJakarta()

  const formatDateDDMMYYYYWithDay = (iso: string) => {
    if (!iso) return ""
    const [y, m, d] = iso.split("-")
    const date = new Date(`${iso}T00:00:00+07:00`)
    const day = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Jakarta" }).format(date)
    return `${day}, ${d}/${m}/${y}`
  }

  const todayBookings = useMemo(() => {
    if (!bookings) return []
    return bookings
      .filter((b) => b.date === today && b.status !== "cancelled")
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [bookings, today])

  const upcomingBookings = useMemo(() => {
    if (!bookings) return []
    return bookings
      .filter((b) => b.date > today && b.status === "confirmed")
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        return a.startTime.localeCompare(b.startTime)
      })
      .slice(0, 5)
  }, [bookings, today])

  const warnings = useMemo(() => {
    if (!bookings || !venues) return []
    const warns: string[] = []

    const draftsToday = todayBookings.filter((b) => b.status === "draft")
    if (draftsToday.length > 0) {
      warns.push(`${draftsToday.length} draft booking(s) for today need confirmation`)
    }

    const missingStaff = todayBookings.filter((b) => !b.gaName || !b.driverName)
    if (missingStaff.length > 0) {
      warns.push(`${missingStaff.length} booking(s) today missing GA or driver assignment`)
    }

    return warns
  }, [todayBookings, bookings, venues])

  const stats = useMemo(() => {
    if (!bookings) return { total: 0, confirmed: 0, draft: 0, todayPax: 0 }

    const todayPax = todayBookings.reduce((sum, b) => sum + b.pax, 0)

    return {
      total: bookings.length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      draft: bookings.filter((b) => b.status === "draft").length,
      todayPax,
    }
  }, [bookings, todayBookings])

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

  const getStatusBarAccent = (status: BookingStatus) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-500/35"
      case "draft":
        return "bg-amber-500/35"
      case "cancelled":
        return "bg-red-500/35"
    }
  }

  const getStatusBadgeClass = (status: BookingStatus) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-300"
      case "draft":
        return "bg-amber-500/15 text-amber-700 border-amber-500/25 dark:text-amber-300"
      case "cancelled":
        return "bg-red-500/15 text-red-700 border-red-500/25 dark:text-red-300"
    }
  }

  // Show per-item spinner on navigate to detail booking
  const [navigatingId, setNavigatingId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)")
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  const goTo = (id: string) => {
    try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
    setNavigatingId(id)
    router.push(`/bookings/${id}`)
  }

  return (
    <NavLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
        {/* Stats Cards - Mobile horizontal */}
        <div className="sm:hidden -mx-3 mb-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 py-1">
            {isLoadingAny ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="min-w-[150px] p-2">
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-6 w-14" />
                    </div>
                  </Card>
                ))}
              </>
            ) : (
              <>
            <Card className="min-w-[150px] p-2 bg-gradient-to-br from-primary/20 to-transparent hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="space-y-1">
                <div className="text-[10px] font-medium text-muted-foreground">Today's Bookings</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-semibold">{todayBookings.length}</span>
                    <span className="text-[10px] text-muted-foreground">{stats.todayPax} pax</span>
                  </div>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Card>

            <Card className="min-w-[150px] p-2 bg-gradient-to-br from-blue-500/20 to-transparent hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="space-y-1">
                <div className="text-[10px] font-medium text-muted-foreground">Total Bookings</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-semibold">{stats.total}</span>
                  </div>
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Card>

            <Card className="min-w-[150px] p-2 bg-gradient-to-br from-emerald-500/20 to-transparent hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="space-y-1">
                <div className="text-[10px] font-medium text-muted-foreground">Confirmed</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-semibold">{stats.confirmed}</span>
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Card>

            <Card className="min-w-[150px] p-2 bg-gradient-to-br from-amber-500/20 to-transparent hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="space-y-1">
                <div className="text-[10px] font-medium text-muted-foreground">Draft</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-semibold">{stats.draft}</span>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Card>
              </>
            )}
          </div>
        </div>

        {/* Stats Cards - Desktop grid */}
        <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-2">
          {isLoadingAny ? (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-28 mb-2" />
                    <Skeleton className="h-7 w-16" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
          <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-br from-primary/10 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2">
              <CardTitle className="text-sm font-medium">Today's Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-2">
              <div className="text-2xl font-bold">{todayBookings.length}</div>
              <p className="text-xs text-muted-foreground">{stats.todayPax} total guests</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-br from-blue-500/10 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-2">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-br from-emerald-500/10 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2">
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-2">
              <div className="text-2xl font-bold">{stats.confirmed}</div>
              <p className="text-xs text-muted-foreground">Active bookings</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-br from-amber-500/10 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-2">
              <div className="text-2xl font-bold">{stats.draft}</div>
              <p className="text-xs text-muted-foreground">Needs confirmation</p>
            </CardContent>
          </Card>
            </>
          )}
        </div>

        {/* Warnings */}
        {false && warnings.length > 0 && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Warnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {warnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-destructive">{"\u2022"}</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
            <CardDescription>
              {formatDateDDMMYYYYWithDay(today)} - {todayBookings.length} booking(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAny ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border">
                    <div className="flex gap-3">
                      <div className="w-16">
                        <Skeleton className="h-4 w-10 mb-1" />
                        <Skeleton className="h-3 w-8" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-2/3" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                      <Skeleton className="h-8 w-16 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : todayBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No bookings scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayBookings.map((booking) => {
                  const activity = activities?.find((a) => a.id === booking.activityId)
                  const venue = venues?.find((v) => v.id === booking.venueId)

                  return (
                    <div
                      key={booking.id}
                      className="relative flex flex-col sm:flex-row items-start gap-3 sm:gap-4 py-3 px-6 sm:py-4 sm:px-6 rounded-lg border border-border odd:bg-accent/30 sm:odd:bg-transparent bg-gradient-to-br from-accent/10 to-transparent hover:bg-accent/40 hover:shadow-sm transition-all"
                      onClick={() => { if (isMobile) { setSelectedBooking(booking as Booking); setDrawerOpen(true) } }}
                    >
                      <span aria-hidden className={`absolute left-0 top-0 h-full w-1.5 rounded-l ${getStatusBarAccent(booking.status)}`} />
                      <div className="flex-shrink-0 sm:w-20 w-full sm:text-left">
                        <div className="flex items-center justify-between sm:block">
                          <div className="text-left">
                            <div className="text-sm font-medium font-mono">{booking.startTime}</div>
                            <div className="text-xs text-muted-foreground font-mono">{booking.endTime}</div>
                          </div>
                          <div className="sm:hidden ml-2">
                            <Badge variant="outline" className={getStatusBadgeClass(booking.status)}>{booking.status}</Badge>
                          </div>
                        </div>
                        <div className="hidden sm:block mt-1">
                          <Badge variant="outline" className={getStatusBadgeClass(booking.status)}>{booking.status}</Badge>
                        </div>
                      </div>

                      <div className="flex-shrink-0 sm:w-20 w-full sm:text-left">
                        <div className="flex items-center mb-1 w-full min-w-0">
                          <h4 className="font-semibold truncate flex-1 min-w-0">{activity?.name}</h4>
                          <div className="ml-auto sm:hidden">
                            <Button variant="outline" size="sm" className="shrink-0" asChild disabled={navigatingId === booking.id}>
                              <Link prefetch={false} href={`/bookings/${booking.id}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(booking.id) }}>
                                {navigatingId === booking.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>Edit</>
                                )}
                              </Link>
                            </Button>
                          </div>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground space-y-1 min-w-0">
                          <p className="flex items-center gap-1 truncate">
                            <User className="h-3.5 w-3.5 opacity-70" />
                            <span className="font-medium">Guest:</span>
                            <span className="truncate">{booking.guestName} ({booking.suiteNumber})</span>
                          </p>
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="h-3.5 w-3.5 opacity-70" />
                            <span className="font-medium">Venue:</span>
                            <span className="truncate">{venue?.name}</span>
                            <span className="mx-1">{" \u2022 "}</span>
                            <span className="font-medium">Pax:</span> {booking.pax}
                          </div>
                          {(booking.gaName || booking.driverName) && (
                            <p className="flex items-center gap-1 truncate">
                              <Users className="h-3.5 w-3.5 opacity-70" />
                              {booking.gaName && (
                                <>
                                  <span className="font-medium">GA:</span> {booking.gaName}
                                </>
                              )}
                              {booking.gaName && booking.driverName && " \u2022 "}
                              {booking.driverName && (
                                <>
                                  <span className="font-medium">Driver:</span> {booking.driverName}
                                </>
                              )}
                            </p>
                          )}
                          {booking.remark && <p className="italic truncate">{booking.remark}</p>}
                        </div>
                      </div>

                      {/* Desktop-only controls on the right */}
                      <div className="hidden sm:flex gap-2 sm:ml-auto">
                        <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => { setSelectedBooking(booking as Booking); setDrawerOpen(true) }}>
                          View
                        </Button>
                        <Button variant="outline" size="sm" asChild disabled={navigatingId === booking.id}>
                          <Link prefetch={false} href={`/bookings/${booking.id}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(booking.id) }}>
                            {navigatingId === booking.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>Edit</>
                            )}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Bookings</CardTitle>
            <CardDescription>Next 5 confirmed bookings</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAny ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-8 w-16" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                      <Skeleton className="h-8 w-16 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming bookings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((booking) => {
                  const activity = activities?.find((a) => a.id === booking.activityId)
                  const venue = venues?.find((v) => v.id === booking.venueId)

                  return (
                    <div
                      key={booking.id}
                      className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 px-6 rounded-lg border border-border odd:bg-accent/30 sm:odd:bg-transparent hover:bg-accent/50 transition-colors"
                      onClick={() => { if (isMobile) { setSelectedBooking(booking as Booking); setDrawerOpen(true) } }}
                    >
                      <span aria-hidden className={`absolute left-0 top-0 h-full w-1.5 rounded-l ${getStatusBarAccent(booking.status)}`} />
                      <div className="flex items-center gap-4 w-full">
                        <div className="min-w-[100px]">
                          <div className="text-left">
                            <div className="text-sm font-medium">{booking.date}</div>
                            <div className="text-xs text-muted-foreground">{booking.startTime}</div>
                          </div>
                          {/* Mobile: badge under booking time */}
                          <div className="sm:hidden mt-1">
                            <Badge variant="outline" className={getStatusBadgeClass(booking.status)}>{booking.status}</Badge>
                          </div>
                          <div className="hidden sm:block mt-1">
                            <Badge variant="outline" className={getStatusBadgeClass(booking.status)}>{booking.status}</Badge>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 w-full min-w-0">
                            <div className="font-medium truncate flex-1 min-w-0">{activity?.name}</div>
                            <div className="ml-auto sm:hidden">
                              <Button variant="outline" size="sm" asChild disabled={navigatingId === booking.id}>
                                <Link prefetch={false} href={`/bookings/${booking.id}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(booking.id) }}>
                                  {navigatingId === booking.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>Edit</>
                                  )}
                                </Link>
                              </Button>
                            </div>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground truncate">
                            {booking.guestName} {" \u2022 "} {venue?.name}
                          </div>
                        </div>
                      </div>
                      <div className="hidden sm:flex gap-2 sm:ml-auto">
                        <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => { setSelectedBooking(booking as Booking); setDrawerOpen(true) }}>
                          View
                        </Button>
                        <Button variant="outline" size="sm" asChild disabled={navigatingId === booking.id}>
                          <Link prefetch={false} href={`/bookings/${booking.id}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(booking.id) }}>
                            {navigatingId === booking.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>Edit</>
                            )}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BookingDrawer
        booking={selectedBooking}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedBooking(null) }}
      />
    </NavLayout>
  )
}
