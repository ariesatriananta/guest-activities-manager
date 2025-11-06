"use client"

import type React from "react"

import { useState } from "react"
import { useVenues, useCreateVenue, useUpdateVenue, useDeleteVenue } from "@/lib/hooks/useVenues"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Loader2 } from "lucide-react"
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
import type { Venue } from "@/lib/types"

export function VenuesSettings() {
  const { data: venues, isLoading } = useVenues()
  const createVenue = useCreateVenue()
  const updateVenue = useUpdateVenue()
  const deleteVenue = useDeleteVenue()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    capacity: 10,
  })
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)

  const handleOpenDialog = (venue?: Venue) => {
    if (venue) {
      setEditingVenue(venue)
      setFormData({
        name: venue.name,
        location: venue.location || "",
        capacity: venue.capacity || 10,
      })
    } else {
      setEditingVenue(null)
      setFormData({
        name: "",
        location: "",
        capacity: 10,
      })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSubmitting(true)
      if (editingVenue) {
        await updateVenue.mutateAsync({
          id: editingVenue.id,
          name: formData.name,
          location: formData.location || undefined,
          capacity: formData.capacity,
        })
        toast.success("Venue updated")
      } else {
        await createVenue.mutateAsync({
          name: formData.name,
          location: formData.location || undefined,
          capacity: formData.capacity,
        })
        toast.success("Venue created")
      }
      setDialogOpen(false)
      setFormData({
        name: "",
        location: "",
        capacity: 10,
      })
    } catch (error) {
      console.error("[v0] Failed to save venue:", error)
      toast.error((error as any)?.message || "Failed to save venue")
    } finally {
      setSubmitting(false)
    }
  }

  const askDelete = (venue: Venue) => {
    setSelectedVenue(venue)
    setConfirmOpen(true)
  }

  const onConfirmDelete = async () => {
    if (!selectedVenue) return
    try {
      setDeletingId(selectedVenue.id)
      await deleteVenue.mutateAsync(selectedVenue.id)
      toast.success("Venue deleted")
    } catch (error) {
      console.error("[v0] Failed to delete venue:", error)
      toast.error((error as any)?.message || "Failed to delete venue")
    } finally {
      setDeletingId(null)
      setConfirmOpen(false)
      setSelectedVenue(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Venues</CardTitle>
              <CardDescription>Manage available venues</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Venue
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : venues?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No venues found
                  </TableCell>
                </TableRow>
              ) : (
                venues?.map((venue) => (
                  <TableRow key={venue.id}>
                    <TableCell className="font-medium">{venue.name}</TableCell>
                    <TableCell>{venue.location || "-"}</TableCell>
                    <TableCell>{venue.capacity || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(venue)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => askDelete(venue)} disabled={deletingId === venue.id}>
                          {deletingId === venue.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVenue ? "Edit Venue" : "Add Venue"}</DialogTitle>
            <DialogDescription>{editingVenue ? "Update the venue details" : "Create a new venue"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Poolside Deck"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Optional location details"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Capacity</label>
              <Input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number.parseInt(e.target.value) })}
                min={1}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingVenue ? (submitting ? "Updating..." : "Update") : (submitting ? "Creating..." : "Create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Venue</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedVenue ? (
                <>Are you sure you want to delete <span className="font-medium">{selectedVenue.name}</span>? This cannot be undone.</>
              ) : (
                <>Are you sure?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} disabled={!!deletingId}>
              {deletingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
