import type { Booking, ListBookingsParams } from "@/lib/types"
import * as mockDB from "@/lib/data/mockDB"

export const bookingsService = {
  getAll: async (params?: ListBookingsParams): Promise<Booking[]> => {
    return mockDB.listBookings(params)
  },

  getById: async (id: string): Promise<Booking | undefined> => {
    const booking = await mockDB.getBooking(id)
    return booking || undefined
  },

  create: async (data: Omit<Booking, "id" | "createdAt">): Promise<Booking> => {
    return mockDB.createBooking(data)
  },

  update: async (id: string, data: Partial<Booking>): Promise<Booking | null> => {
    return mockDB.updateBooking(id, data)
  },

  delete: async (id: string): Promise<boolean> => {
    return mockDB.deleteBooking(id)
  },

  checkVenueConflict: async (
    date: string,
    venueId: string,
    excludeBookingId?: string,
  ): Promise<{ hasConflict: boolean; venueName?: string }> => {
    const hasConflict = await mockDB.hasVenueConflict(date, venueId, excludeBookingId)
    if (hasConflict) {
      const venue = await mockDB.getVenue(venueId)
      return { hasConflict: true, venueName: venue?.name }
    }
    return { hasConflict: false }
  },
}
