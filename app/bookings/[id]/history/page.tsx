"use client"

import { use } from "react"
import { ArrowLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBooking, useBookingHistory } from "@/lib/hooks/useBookings"
import { useRouter } from "next/navigation"

const formatDateTime = (iso: string) => {
  const date = new Date(iso)
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export default function BookingHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: booking } = useBooking(id)
  const { data: history, isLoading } = useBookingHistory(id)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="inline-flex items-center gap-2 px-0 text-primary hover:underline"
        onClick={() => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.back()
          } else {
            router.push(`/bookings/${id}`)
          }
        }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Booking History</CardTitle>
          <CardDescription>
            {booking ? `${booking.guestName} • ${booking.date}` : "Review all changes made to this booking"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : (history?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No history recorded for this booking yet.</p>
          ) : (
            <div className="space-y-4">
              {history?.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{formatDateTime(entry.createdAt)}</div>
                    <div className="text-sm text-muted-foreground">
                      {entry.actorName ? `by ${entry.actorName}` : "by System"}
                    </div>
                  </div>
                  <div className="text-sm">
                    {entry.action === "created" ? "Booking created" : "Booking updated"}
                  </div>
                  {entry.action === "updated" && entry.changes?.length ? (
                    <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1">
                      {entry.changes.map((change, idx) => (
                        <li key={`${entry.id}-${change.field}-${idx}`}>
                          <span className="font-medium text-foreground">{change.label}:</span>{" "}
                          <span>{change.oldValue ?? "-"}</span>
                          <span className="mx-1 text-foreground">→</span>
                          <span>{change.newValue ?? "-"}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
