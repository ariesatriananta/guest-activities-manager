"use client"

import * as React from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import type { BookingStatus, ActivityCategory as Category, Venue } from "@/lib/types"
import { SlidersHorizontal, FilterX } from "lucide-react"

export interface FiltersValues {
  dateFrom?: string
  dateTo?: string
  venueId: string
  categoryId: string
  status: BookingStatus | "all"
}

interface FiltersSheetProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  values: FiltersValues
  onApply: (v: FiltersValues) => void
  venues: Venue[]
  categories: Category[]
  activeCount: number
}

export function FiltersSheet({ open, onOpenChange, values, onApply, venues, categories, activeCount }: FiltersSheetProps) {
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
      <SheetContent side="bottom" className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <div className="flex items-center gap-2">
              <Input type="date" value={draft.dateFrom || ""} onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))} />
              <span className="text-muted-foreground">to</span>
              <Input type="date" min={draft.dateFrom || undefined} value={draft.dateTo || ""} onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Venue</label>
            <Select value={draft.venueId} onValueChange={(v) => setDraft((d) => ({ ...d, venueId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="All venues" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All venues</SelectItem>
                {venues?.map((venue) => (
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
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories?.map((category) => (
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
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDraft({ dateFrom: "", dateTo: "", venueId: "all", categoryId: "all", status: "all" })}
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



