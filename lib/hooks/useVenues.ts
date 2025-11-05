import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Venue } from "@/lib/types"

export function useVenues() {
  return useQuery({
    queryKey: ["venues"],
    queryFn: async () => {
      const res = await fetch("/api/venues", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load venues")
      return (await res.json()) as Venue[]
    },
  })
}

export function useVenue(id: string | null) {
  return useQuery({
    queryKey: ["venue", id],
    queryFn: async () => {
      if (!id) return null
      const res = await fetch("/api/venues", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load venues")
      const list = (await res.json()) as Venue[]
      return list.find((v) => v.id === id) || null
    },
    enabled: !!id,
  })
}

export function useCreateVenue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<Venue, "id">) => {
      const res = await fetch("/api/venues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error("Failed to create venue")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] })
    },
  })
}

export function useUpdateVenue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Venue> }) => {
      const res = await fetch(`/api/venues/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error("Failed to update venue")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] })
    },
  })
}

export function useDeleteVenue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/venues/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete venue")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] })
    },
  })
}
