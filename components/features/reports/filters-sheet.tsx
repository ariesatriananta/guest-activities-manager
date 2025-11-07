"use client"

import * as React from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { DateField } from "@/components/ui/date-field"
import { SlidersHorizontal, FilterX } from "lucide-react"

export interface ReportsFiltersValues {
  dateFrom?: string
  dateTo?: string
}

interface ReportsFiltersSheetProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  values: ReportsFiltersValues
  onApply: (v: ReportsFiltersValues) => void
  activeCount: number
}

export function ReportsFiltersSheet({ open, onOpenChange, values, onApply, activeCount }: ReportsFiltersSheetProps) {
  const [draft, setDraft] = React.useState<ReportsFiltersValues>(values)
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

        <div className="mt-4 grid grid-cols-1 gap-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <div className="flex items-center gap-2 w-full">
              <DateField modal className="flex-1" value={draft.dateFrom || ""} onChange={(v) => setDraft((d) => ({ ...d, dateFrom: v }))} />
              <span className="text-muted-foreground">to</span>
              <DateField modal className="flex-1" value={draft.dateTo || ""} onChange={(v) => setDraft((d) => ({ ...d, dateTo: v }))} />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <Button variant="ghost" size="sm" onClick={() => setDraft({ dateFrom: "", dateTo: "" })}>
            <FilterX className="h-4 w-4 mr-2" /> Clear
          </Button>
          <Button size="sm" onClick={() => { onApply(draft); onOpenChange(false) }}>Apply</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

