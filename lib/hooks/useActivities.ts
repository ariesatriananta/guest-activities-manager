import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Activity, ActivityCategory } from "@/lib/types"
import * as mockDB from "@/lib/data/mockDB"

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => mockDB.listCategories(),
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<ActivityCategory, "id">) => mockDB.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ActivityCategory> }) => mockDB.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => mockDB.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      queryClient.invalidateQueries({ queryKey: ["activities"] })
    },
  })
}

export function useActivities() {
  return useQuery({
    queryKey: ["activities"],
    queryFn: () => mockDB.listActivities(),
  })
}

export function useActivitiesByCategory(categoryId: string | null) {
  return useQuery({
    queryKey: ["activities", "by-category", categoryId],
    queryFn: () => (categoryId ? mockDB.getActivitiesByCategory(categoryId) : []),
    enabled: !!categoryId,
  })
}

export function useCreateActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<Activity, "id">) => mockDB.createActivity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] })
    },
  })
}

export function useUpdateActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Activity> }) => mockDB.updateActivity(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] })
    },
  })
}

export function useDeleteActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => mockDB.deleteActivity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] })
    },
  })
}
