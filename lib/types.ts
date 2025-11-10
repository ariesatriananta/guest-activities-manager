export interface ActivityCategory {
  id: string
  name: string
  description?: string
}

export interface Activity {
  id: string
  categoryId: string
  name: string
  isActive: boolean
  description?: string
  duration: number
  maxCapacity?: number
}

export interface Venue {
  id: string
  name: string
  isSingleBookingPerDay: boolean
  isExclusiveByTime?: boolean
  location?: string
  capacity?: number
}

export type BookingStatus = "tentative" | "confirmed" | "cancelled"

export interface Booking {
  id: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  activityId: string
  venueId: string
  guestName: string
  suiteNumber: string
  pax: number
  gaName: string
  driverName: string
  remark: string
  status: BookingStatus
  createdAt: string
}

export interface BookingFormData {
  date: string
  startTime: string
  endTime: string
  categoryId: string
  activityId: string
  venueId: string
  guestName: string
  suiteNumber: string
  pax: number
  gaName: string
  driverName: string
  remark: string
  status: BookingStatus
}

export interface ListBookingsParams {
  dateFrom?: string
  dateTo?: string
  venueId?: string
  categoryId?: string
  status?: BookingStatus
}

// Auth / Users
export type UserRole = "admin" | "staff"

export interface Profile {
  id: string
  email: string
  name: string
  role: UserRole
  avatar_img?: string | null
  created_at: string
  updated_at: string
}

// Compat alias
export type Category = ActivityCategory
