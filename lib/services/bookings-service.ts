import type { Booking, BookingHistoryEntry, ListBookingsParams } from "@/lib/types"

export const bookingsService = {
  getAll: async (params?: ListBookingsParams): Promise<Booking[]> => {
    const qs = new URLSearchParams()
    if (params?.dateFrom) qs.set("dateFrom", params.dateFrom)
    if (params?.dateTo) qs.set("dateTo", params.dateTo)
    if (params?.venueId) qs.set("venueId", params.venueId)
    if (params?.categoryId) qs.set("categoryId", params.categoryId)
    if (params?.status) qs.set("status", params.status)
    const res = await fetch(`/api/bookings${qs.toString() ? `?${qs}` : ""}`, { cache: "no-store" })
    if (!res.ok) throw new Error("Failed to load bookings")
    return res.json()
  },

  getById: async (id: string): Promise<Booking | undefined> => {
    const res = await fetch(`/api/bookings/${id}`, { cache: "no-store" })
    if (!res.ok) return undefined
    return (await res.json()) || undefined
  },

  create: async (data: Omit<Booking, "id" | "createdAt" | "updatedAt" | "createdById" | "updatedById" | "createdByName" | "updatedByName">): Promise<Booking> => {
    const res = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    if (!res.ok) {
      const j = await res.json().catch(() => null)
      throw new Error(j?.error || "Failed to create booking")
    }
    return res.json()
  },

  update: async (id: string, data: Partial<Booking>): Promise<Booking | null> => {
    const res = await fetch(`/api/bookings/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    if (!res.ok) {
      const j = await res.json().catch(() => null)
      throw new Error(j?.error || "Failed to update booking")
    }
    return res.json()
  },

  delete: async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const j = await res.json().catch(() => null)
      throw new Error(j?.error || "Failed to delete booking")
    }
    return true
  },

  getHistory: async (id: string): Promise<BookingHistoryEntry[]> => {
    const res = await fetch(`/api/bookings/${id}/history`, { cache: "no-store" })
    if (!res.ok) throw new Error("Failed to load history")
    return res.json()
  },

  checkVenueConflict: async (
    date: string,
    venueId: string,
    opts?: { excludeBookingId?: string; startTime?: string; endTime?: string },
  ): Promise<{ hasConflict: boolean; venueName?: string; guestName?: string; activityName?: string }> => {
    const res = await fetch(`/api/bookings/conflict`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, venueId, excludeBookingId: opts?.excludeBookingId, startTime: opts?.startTime, endTime: opts?.endTime }) })
    if (!res.ok) throw new Error("Failed to check conflict")
    return res.json()
  },
}
