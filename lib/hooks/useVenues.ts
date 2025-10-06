import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Venue } from "@/lib/types"
import * as mockDB from "@/lib/data/mockDB"

export function useVenues() {
  return useQuery({
    queryKey: ["venues"],
    queryFn: () => mockDB.listVenues(),
  })
}

export function useVenue(id: string | null) {
  return useQuery({
    queryKey: ["venue", id],
    queryFn: () => (id ? mockDB.getVenue(id) : null),
    enabled: !!id,
  })
}

export function useCreateVenue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<Venue, "id">) => mockDB.createVenue(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] })
    },
  })
}

export function useUpdateVenue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Venue> }) => mockDB.updateVenue(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] })
    },
  })
}

export function useDeleteVenue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => mockDB.deleteVenue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] })
    },
  })
}
