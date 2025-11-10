"use client"

import * as React from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { DateField } from "@/components/ui/date-field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useVenues } from "@/lib/hooks/useVenues"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Check } from "lucide-react"

type Availability = {
  venueId: string
  date: string
  slot: number
  used: { start: string; end: string; guestName?: string; activityName?: string }[]
  free: { start: string; end: string }[]
  freeSlots: { start: string; end: string }[]
}

export function VenueAvailabilitySheet() {
  const [open, setOpen] = React.useState(false)
  const { data: venues, isLoading } = useVenues()
  const [venueId, setVenueId] = React.useState<string>("")
  const [date, setDate] = React.useState<string>("")
  const [loading, setLoading] = React.useState(false)
  const [data, setData] = React.useState<Availability | null>(null)

  const canFetch = !!venueId && !!date

  const fetchData = async () => {
    if (!canFetch) return
    setLoading(true)
    try {
      const qs = new URLSearchParams({ venueId, date })
      const res = await fetch(`/api/venues/availability?${qs}`)
      if (!res.ok) throw new Error("Failed to load availability")
      const j = (await res.json()) as Availability
      setData(j)
    } catch (e) {
      console.error(e)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (open && canFetch) fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, venueId, date])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="inline-flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Availability
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="sm:max-w-xl sm:w-full sm:left-1/2 sm:top-1/2 sm:right-auto sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
        <SheetHeader>
          <SheetTitle>Venue Availability</SheetTitle>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Venue</label>
            {isLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select value={venueId} onValueChange={(v) => setVenueId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select venue" />
                </SelectTrigger>
                <SelectContent>
                  {(venues || []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Date</label>
            <DateField modal value={date} onChange={setDate} />
          </div>
        </div>

        <div className="mt-4">
          <Button size="sm" onClick={fetchData} disabled={!canFetch || loading}>
            Check
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-4/5" />
            </div>
          ) : !data ? (
            <p className="text-sm text-muted-foreground">Select venue and date to see availability.</p>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Slot size: {data.slot} minutes</div>
              <div>
                <div className="text-sm font-medium mb-1">Booked</div>
                {data.used.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bookings</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.used.map((u, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded border bg-red-500/10 border-red-500/25 text-red-700 dark:text-red-300">
                        {u.start}–{u.end}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Available (suggested {data.slot}m slots)</div>
                {data.freeSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No free slots</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.freeSlots.map((f, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded border bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                        <Check className="h-3 w-3" /> {f.start}–{f.end}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

