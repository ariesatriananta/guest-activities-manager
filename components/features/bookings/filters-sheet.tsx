"use client"

import * as React from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { DateField } from "@/components/ui/date-field"
import type { BookingStatus, ActivityCategory as Category, Venue } from "@/lib/types"
import { SlidersHorizontal, FilterX } from "lucide-react"

export interface FiltersValues {
  dateFrom?: string
  dateTo?: string
  venueId: string
  categoryId: string
  status: BookingStatus | "all"
  creatorId: string
}

interface FiltersSheetProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  values: FiltersValues
  onApply: (v: FiltersValues) => void
  venues: Venue[]
  categories: Category[]
  creators: { id: string; name: string }[]
  activeCount: number
}

export function FiltersSheet({ open, onOpenChange, values, onApply, venues, categories, creators, activeCount }: FiltersSheetProps) {
  const [draft, setDraft] = React.useState<FiltersValues>(values)
  React.useEffect(() => {
    if (open) setDraft(values)
  }, [open, values])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="inline-flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" /> Filters
          {activeCount > 0 ? (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] font-medium text-primary">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="sm:max-w-xl sm:w-full sm:left-1/2 sm:top-1/2 sm:right-auto sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:data-[state=open]:animate-in sm:data-[state=closed]:animate-out sm:data-[state=open]:fade-in-0 sm:data-[state=closed]:fade-out-0 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:duration-300 sm:data-[state=closed]:duration-200"
      >
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <div className="flex items-center gap-2 w-full">
              <DateField
                modal
                className="flex-1"
                value={draft.dateFrom || ""}
                onChange={(v) => setDraft((d) => ({ ...d, dateFrom: v }))}
              />
              <span className="text-muted-foreground">to</span>
              <DateField
                modal
                className="flex-1"
                value={draft.dateTo || ""}
                onChange={(v) => setDraft((d) => ({ ...d, dateTo: v }))}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Venue</label>
            <Select value={draft.venueId} onValueChange={(v) => setDraft((d) => ({ ...d, venueId: v }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All venues" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All venues</SelectItem>
                {(venues || [])
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
                  .map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Category</label>
            <Select value={draft.categoryId} onValueChange={(v) => setDraft((d) => ({ ...d, categoryId: v }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(categories || [])
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={draft.status} onValueChange={(v) => setDraft((d) => ({ ...d, status: v as any }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="tentative">Tentative</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Creator</label>
            <Select value={draft.creatorId} onValueChange={(v) => setDraft((d) => ({ ...d, creatorId: v }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All creators" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All creators</SelectItem>
                {(creators || [])
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
                  .map((creator) => (
                    <SelectItem key={creator.id} value={creator.id}>
                      {creator.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDraft({ dateFrom: "", dateTo: "", venueId: "all", categoryId: "all", status: "all", creatorId: "all" })}
          >
            <FilterX className="h-4 w-4 mr-2" /> Clear
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onApply(draft)
              onOpenChange(false)
            }}
          >
            Apply
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}



