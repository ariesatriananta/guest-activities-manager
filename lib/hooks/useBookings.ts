import useSWR from "swr"
import { bookingsService } from "@/lib/services/bookings-service"
import type { Booking, BookingHistoryEntry } from "@/lib/types"

export function useBookings() {
  return useSWR<Booking[]>("bookings", () => bookingsService.getAll())
}

export function useBooking(id: string) {
  return useSWR<Booking | undefined>(id ? `booking-${id}` : null, () => bookingsService.getById(id))
}

export function useCreateBooking() {
  const { mutate } = useSWR<Booking[]>("bookings")

  return {
    mutateAsync: async (
      data: Omit<Booking, "id" | "createdAt" | "updatedAt" | "createdById" | "updatedById" | "createdByName" | "updatedByName"> & {
        allowTentativeOverride?: boolean
      },
    ) => {
      const newBooking = await bookingsService.create(data)
      mutate()
      return newBooking
    },
  }
}

export function useUpdateBooking() {
  const { mutate } = useSWR<Booking[]>("bookings")

  return {
    mutateAsync: async ({ id, data }: { id: string; data: Partial<Booking> & { allowTentativeOverride?: boolean } }) => {
      const updated = await bookingsService.update(id, data)
      mutate()
      return updated
    },
  }
}

export function useDeleteBooking() {
  const { mutate } = useSWR<Booking[]>("bookings")

  return {
    mutateAsync: async (id: string) => {
      await bookingsService.delete(id)
      mutate()
    },
  }
}

export function useCheckVenueConflict() {
  return {
    mutateAsync: async ({ date, venueId, excludeBookingId, startTime, endTime }: { date: string; venueId: string; excludeBookingId?: string; startTime?: string; endTime?: string }) => {
      return bookingsService.checkVenueConflict(date, venueId, { excludeBookingId, startTime, endTime })
    },
  }
}

export function useBookingHistory(id: string) {
  return useSWR<BookingHistoryEntry[]>(id ? `booking-history-${id}` : null, () => bookingsService.getHistory(id))
}
