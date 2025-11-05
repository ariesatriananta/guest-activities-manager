"use client"

import { useBookings } from "@/lib/hooks/useBookings"
import { useActivities } from "@/lib/hooks/useActivities"
import { useVenues } from "@/lib/hooks/useVenues"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Users, AlertTriangle, LayoutGrid } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"
import { todayISOInJakarta } from "@/lib/utils"
import type { BookingStatus } from "@/lib/types"
import { NavLayout } from "@/components/layout/nav-layout"

export default function DashboardPage() {
  const { data: bookings } = useBookings()
  const { data: activities } = useActivities()
  const { data: venues } = useVenues()

  const today = todayISOInJakarta()

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

  return (
    <NavLayout>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayBookings.length}</div>
              <p className="text-xs text-muted-foreground">{stats.todayPax} total guests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.confirmed}</div>
              <p className="text-xs text-muted-foreground">Active bookings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draft}</div>
              <p className="text-xs text-muted-foreground">Needs confirmation</p>
            </CardContent>
          </Card>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
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
              {today} - {todayBookings.length} booking(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No bookings scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayBookings.map((booking) => {
                  const activity = activities?.find((a) => a.id === booking.activityId)
                  const venue = venues?.find((v) => v.id === booking.venueId)

                  return (
                    <div
                      key={booking.id}
                      className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-20 text-center">
                        <div className="text-sm font-medium">{booking.startTime}</div>
                        <div className="text-xs text-muted-foreground">{booking.endTime}</div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{activity?.name}</h4>
                          <Badge variant={getStatusColor(booking.status)}>{booking.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            <span className="font-medium">Guest:</span> {booking.guestName} ({booking.suiteNumber})
                          </p>
                          <p>
                            <span className="font-medium">Venue:</span> {venue?.name} {" \u2022 "}
                            <span className="font-medium">Pax:</span> {booking.pax}
                          </p>
                          {(booking.gaName || booking.driverName) && (
                            <p>
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
                          {booking.remark && <p className="italic">{booking.remark}</p>}
                        </div>
                      </div>

                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/bookings/${booking.id}`}>View</Link>
                      </Button>
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
            {upcomingBookings.length === 0 ? (
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
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[80px]">
                          <div className="text-sm font-medium">{booking.date}</div>
                          <div className="text-xs text-muted-foreground">{booking.startTime}</div>
                        </div>
                        <div>
                          <div className="font-medium">{activity?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {booking.guestName} {" \u2022 "} {venue?.name}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/bookings/${booking.id}`}>View</Link>
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </NavLayout>
  )
}
