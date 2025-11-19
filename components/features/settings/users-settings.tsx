"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Profile } from "@/lib/types"
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

async function fetchUsers(): Promise<Profile[]> {
  const res = await fetch("/api/users", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load users")
  return res.json()
}

export function UsersSettings() {
  const qc = useQueryClient()
  const { data: users, isLoading } = useQuery({ queryKey: ["users"], queryFn: fetchUsers })

  const createUser = useMutation({
    mutationFn: async (payload: { email: string; password: string; name: string; role: "admin" | "staff" | "viewer"; avatar_img?: string }) => {
      const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) {
        let msg = "Failed to create user"
        try { const j = await res.json(); msg = j?.error || msg } catch {}
        throw new Error(msg)
      }
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); toast.success("User created") },
    onError: (err: any) => toast.error(err?.message || "Failed to create user"),
  })

  const updateUser = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; role?: "admin" | "staff" | "viewer"; avatar_img?: string; password?: string } }) => {
      const res = await fetch(`/api/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      if (!res.ok) { let msg = "Failed to update user"; try { const j = await res.json(); msg = j?.error || msg } catch {}; throw new Error(msg) }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["users"] })
      const changed: string[] = []
      if (variables.data.password) changed.push("password")
      if (Object.prototype.hasOwnProperty.call(variables.data, "avatar_img")) changed.push("avatar")
      if (changed.length) {
        toast.success(`User updated (${changed.join(" & ")} changed)`) 
      } else {
        toast.success("User updated")
      }
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update user"),
  })

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" })
      if (!res.ok) { let msg = "Failed to delete user"; try { const j = await res.json(); msg = j?.error || msg } catch {}; throw new Error(msg) }
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); toast.success("User deleted") },
    onError: (err: any) => toast.error(err?.message || "Failed to delete user"),
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [form, setForm] = useState<{ email: string; password: string; name: string; role: "admin" | "staff" | "viewer"; avatar_img: string }>(
    { email: "", password: "", name: "", role: "staff", avatar_img: "" },
  )
  const [formError, setFormError] = useState<string | null>(null)

  const openCreate = () => {
    setEditing(null)
    setForm({ email: "", password: "", name: "", role: "staff", avatar_img: "" })
    setDialogOpen(true)
  }
  const openEdit = (u: Profile) => {
    setEditing(u)
    setForm({ email: u.email, password: "", name: u.name, role: u.role, avatar_img: u.avatar_img || "" })
    setDialogOpen(true)
  }

  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Client-side validation
    setFormError(null)
    const emailOk = /.+@.+\..+/.test(form.email)
    if (!emailOk) { setFormError("Email tidak valid"); return }
    if (!editing && form.password.trim().length < 4) { setFormError("Password minimal 4 karakter"); return }
    if (form.name.trim().length === 0) { setFormError("Nama wajib diisi"); return }
    if (form.avatar_img && form.avatar_img.trim().length > 0) {
      try { new URL(form.avatar_img) } catch { setFormError("Avatar URL tidak valid"); return }
    }
    try {
      setSubmitting(true)
      try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
      if (editing) {
        await updateUser.mutateAsync({ id: editing.id, data: { name: form.name, role: form.role, avatar_img: form.avatar_img || undefined, password: form.password || undefined } })
      } else {
        await createUser.mutateAsync({ email: form.email, password: form.password, name: form.name, role: form.role, avatar_img: form.avatar_img || undefined })
      }
      setDialogOpen(false)
    } catch (err: any) {
      setFormError(err?.message || "Terjadi kesalahan saat menyimpan user")
    } finally {
      setSubmitting(false)
      try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {}
    }
  }

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedDelete, setSelectedDelete] = useState<Profile | null>(null)
  const onAskDelete = (u: Profile) => { setSelectedDelete(u); setConfirmOpen(true) }
  const onConfirmDelete = async () => {
    if (!selectedDelete) return
    setDeletingId(selectedDelete.id)
    try {
      try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
      await deleteUser.mutateAsync(selectedDelete.id)
    } finally {
      setDeletingId(null); setConfirmOpen(false); setSelectedDelete(null)
      try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {}
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage application users (admin only)</CardDescription>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono"><Skeleton className="h-4 w-56" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : users?.length ? (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono">{u.email}</TableCell>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          u.role === "admin"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                            : u.role === "staff"
                              ? "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-200"
                              : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-200"
                        }
                      >
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onAskDelete(u)} disabled={deletingId === u.id}>
                          {deletingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No users</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update user details" : "Create a new user"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!editing} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Name</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Role</label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium mb-2 block">Avatar URL (optional)</label>
                <Input value={form.avatar_img} onChange={(e) => setForm({ ...form, avatar_img: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium mb-2 block">{editing ? "New Password (optional)" : "Password"}</label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} {...(editing ? {} : { required: true })} />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? (submitting ? "Updating..." : "Update") : (submitting ? "Creating..." : "Create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedDelete ? (
                <>Are you sure you want to delete <span className="font-medium">{selectedDelete.email}</span>? This action cannot be undone.</>
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
