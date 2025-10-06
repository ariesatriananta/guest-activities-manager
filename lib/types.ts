export interface ActivityCategory {
  id: string
  name: string
}

export interface Activity {
  id: string
  categoryId: string
  name: string
  isActive: boolean
}

export interface Venue {
  id: string
  name: string
  isSingleBookingPerDay: boolean
}

export type BookingStatus = "draft" | "confirmed" | "cancelled"

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
