import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Timezone helpers
export const JAKARTA_TZ = 'Asia/Jakarta'

// Return YYYY-MM-DD string for given date in Asia/Jakarta (or provided tz)
export function formatDateISOInTZ(date: Date, tz: string = JAKARTA_TZ): string {
  // en-CA yields YYYY-MM-DD
  return date.toLocaleDateString('en-CA', { timeZone: tz })
}

export function todayISOInJakarta(): string {
  return formatDateISOInTZ(new Date(), JAKARTA_TZ)
}
