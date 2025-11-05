import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Activity, ActivityCategory } from "@/lib/types"

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load categories")
      return (await res.json()) as ActivityCategory[]
    },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<ActivityCategory, "id">) => {
      const res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error("Failed to create category")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ActivityCategory> }) => {
      const res = await fetch(`/api/categories/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error("Failed to update category")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete category")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      queryClient.invalidateQueries({ queryKey: ["activities"] })
    },
  })
}

export function useActivities() {
  return useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const res = await fetch("/api/activities", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load activities")
      return (await res.json()) as Activity[]
    },
  })
}

export function useActivitiesByCategory(categoryId: string | null) {
  return useQuery({
    queryKey: ["activities", "by-category", categoryId],
    queryFn: async () => {
      if (!categoryId) return [] as Activity[]
      const res = await fetch(`/api/activities?categoryId=${encodeURIComponent(categoryId)}`, { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load activities")
      return (await res.json()) as Activity[]
    },
    enabled: !!categoryId,
  })
}

export function useCreateActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<Activity, "id">) => {
      const res = await fetch("/api/activities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error("Failed to create activity")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] })
    },
  })
}

export function useUpdateActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Activity> }) => {
      const res = await fetch(`/api/activities/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error("Failed to update activity")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] })
    },
  })
}

export function useDeleteActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete activity")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] })
    },
  })
}
