"use client"

import type React from "react"

import { useState } from "react"
import {
  useActivities,
  useCategories,
  useCreateActivity,
  useUpdateActivity,
  useDeleteActivity,
} from "@/lib/hooks/useActivities"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Loader2, CheckCircle2, Archive, Trash } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Activity } from "@/lib/types"

export function ActivitiesSettings() {
  const { data: activities, isLoading } = useActivities()
  const { data: categories } = useCategories()
  const createActivity = useCreateActivity()
  const updateActivity = useUpdateActivity()
  const deleteActivity = useDeleteActivity()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    description: "",
    duration: 60,
    maxCapacity: 10,
  })
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [selectedHasBooking, setSelectedHasBooking] = useState<boolean>(true)

  const handleOpenDialog = (activity?: Activity) => {
    if (activity) {
      setEditingActivity(activity)
      setFormData({
        name: activity.name,
        categoryId: activity.categoryId,
        description: activity.description || "",
        duration: activity.duration,
        maxCapacity: activity.maxCapacity || 10,
      })
    } else {
      setEditingActivity(null)
      setFormData({
        name: "",
        categoryId: "",
        description: "",
        duration: 60,
        maxCapacity: 10,
      })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSubmitting(true)
      try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
      if (editingActivity) {
        await updateActivity.mutateAsync({
          id: editingActivity.id,
          data:{
            name: formData.name,
            categoryId: formData.categoryId,
            description: formData.description || undefined,
            duration: formData.duration,
            maxCapacity: formData.maxCapacity,
            isActive: true,
          }
        })
        toast.success("Activity updated")
      } else {
        await createActivity.mutateAsync({
          name: formData.name,
          categoryId: formData.categoryId,
          description: formData.description || undefined,
          duration: formData.duration,
          maxCapacity: formData.maxCapacity,
        })
        toast.success("Activity created")
      }
      setDialogOpen(false)
      setFormData({
        name: "",
        categoryId: "",
        description: "",
        duration: 60,
        maxCapacity: 10,
      })
    } catch (error) {
      console.error("[v0] Failed to save activity:", error)
      toast.error((error as any)?.message || "Failed to save activity")
    } finally {
      setSubmitting(false)
      try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {}
    }
  }

  const askDelete = (activity: Activity) => {
    setSelectedActivity(activity)
    setSelectedHasBooking(true)
    setConfirmOpen(true)
  }

  const handleActivate = async (activity: Activity) => {
    try {
      setDeletingId(activity.id)
      try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
      await updateActivity.mutateAsync({
        id: activity.id,
        data: { isActive: true },
      })
      toast.success("Activity activated")
    } catch (error) {
      console.error("[v0] Failed to activate activity:", error)
      toast.error((error as any)?.message || "Failed to activate activity")
    } finally {
      setDeletingId(null)
      try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {}
    }
  }

  const onConfirmDelete = async () => {
    if (!selectedActivity) return
    try {
      setDeletingId(selectedActivity.id)
      try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
      const res = await deleteActivity.mutateAsync(selectedActivity.id) as any
      const deleteMode = res?.deleteMode
      toast.success(deleteMode === "hard" ? "Activity deleted permanently" : "Activity deactivated")
    } catch (error) {
      console.error("[v0] Failed to delete activity:", error)
      toast.error((error as any)?.message || "Failed to delete activity")
    } finally {
      setDeletingId(null)
      setConfirmOpen(false)
      setSelectedActivity(null)
      setSelectedHasBooking(true)
      try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {}
    }
  }

  const handleHardDelete = async (activity: Activity) => {
    try {
      setDeletingId(activity.id)
      try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
      const res = await fetch(`/api/activities/${activity.id}/usage`, { cache: "no-store" })
      const data = res.ok ? await res.json() : { hasBooking: true }
      setSelectedActivity(activity)
      setSelectedHasBooking(!!data?.hasBooking)
      setConfirmOpen(true)
    } catch (error) {
      console.error("[v0] Failed to check activity usage:", error)
      toast.error("Failed to check activity usage")
    } finally {
      setDeletingId(null)
      try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {}
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Activities</CardTitle>
              <CardDescription>Manage available activities</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Max Capacity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : activities?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No activities found
                  </TableCell>
                </TableRow>
              ) : (
                activities?.map((activity) => {
                  const category = categories?.find((c) => c.id === activity.categoryId)
                  return (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{activity.name}</span>
                          {activity.isActive === false && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700">
                              Inactive
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{category?.name || "-"}</TableCell>
                      <TableCell>{activity.duration} min</TableCell>
                      <TableCell>{activity.maxCapacity || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(activity)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {activity.isActive === false ? (
                            <Button variant="ghost" size="sm" onClick={() => handleActivate(activity)} disabled={deletingId === activity.id} aria-label="Activate">
                              {deletingId === activity.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => handleHardDelete(activity)} disabled={deletingId === activity.id} aria-label="Delete or Deactivate">
                              {deletingId === activity.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingActivity ? "Edit Activity" : "Add Activity"}</DialogTitle>
            <DialogDescription>
              {editingActivity ? "Update the activity details" : "Create a new activity"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Yoga Session"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Duration (minutes)</label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Number.parseInt(e.target.value) })}
                  min={1}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Max Capacity</label>
                <Input
                  type="number"
                  value={formData.maxCapacity}
                  onChange={(e) => setFormData({ ...formData, maxCapacity: Number.parseInt(e.target.value) })}
                  min={1}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingActivity ? (submitting ? "Updating..." : "Update") : (submitting ? "Creating..." : "Create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{selectedHasBooking ? "Deactivate Activity" : "Delete Activity"}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedActivity ? (
                selectedHasBooking ? (
                  <>Are you sure you want to deactivate <span className="font-medium">{selectedActivity.name}</span>? You can re-enable it later.</>
                ) : (
                  <>This activity has never been used. Deleting <span className="font-medium">{selectedActivity.name}</span> will remove it permanently and cannot be undone.</>
                )
              ) : (
                <>Are you sure?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} disabled={!!deletingId}>
              {deletingId ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : selectedHasBooking ? (
                <Archive className="mr-2 h-4 w-4" />
              ) : (
                <Trash className="mr-2 h-4 w-4" />
              )}
              {selectedHasBooking ? "Deactivate" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
