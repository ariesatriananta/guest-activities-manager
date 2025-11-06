"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarCmp } from "@/components/ui/calendar"
import { formatDateISOInTZ, JAKARTA_TZ, cn } from "@/lib/utils"
import { Calendar as CalendarIcon, X as XIcon } from "lucide-react"

interface DateFieldProps {
  // Expects ISO value (YYYY-MM-DD); component will display as DD/MM/YYYY
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

function isoToDisplay(iso?: string) {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export function DateField({ value, onChange, placeholder = "Pick a date", className, disabled }: DateFieldProps) {
  const display = value ? isoToDisplay(value) : ""
  return (
    <div className={cn("relative", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className={cn("w-full justify-start bg-transparent pr-9") } disabled={disabled}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {display || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          <CalendarCmp
            mode="single"
            selected={value ? new Date(value) : undefined}
            onSelect={(d) => onChange(d ? formatDateISOInTZ(d, JAKARTA_TZ) : "")}
          />
        </PopoverContent>
      </Popover>
      {value && !disabled && (
        <button
          type="button"
          aria-label="Clear date"
          onClick={(e) => { e.stopPropagation(); onChange("") }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
