"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { NavLayout } from "@/components/layout/nav-layout"

export default function ProfilePage() {
  return (
    <NavLayout>
      <ProfileContent />
    </NavLayout>
  )
}

function getInitials(name?: string | null, email?: string | null) {
  const src = (name && name.trim()) || (email && email.split("@")[0]) || "User"
  const parts = src.split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] || "U"
  const second = parts.length > 1 ? parts[1]?.[0] : ""
  return (first + second).toUpperCase()
}

function ProfileContent() {
  const { data: session, update: updateSession } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [avatar, setAvatar] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" })
        const me = await res.json()
        setEmail(me?.email || "")
        setName(me?.name || "")
        setAvatar(me?.avatar_img || "")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatar_img: avatar || undefined }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error || "Failed to update profile")
      }
      toast.success("Profile updated")
      // Refresh session display name & avatar
      await updateSession({ name, image: avatar || null } as any)
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const [savingPwd, setSavingPwd] = useState(false)
  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || newPassword.length < 4) {
      toast.error("Please provide current password and a new password (min 4 chars)")
      return
    }
    setSavingPwd(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok) throw new Error(j?.error || "Failed to change password")
      toast.success("Password changed")
      setCurrentPassword("")
      setNewPassword("")
    } catch (err: any) {
      toast.error(err?.message || "Failed to change password")
    } finally {
      setSavingPwd(false)
    }
  }

  const initials = getInitials(session?.user?.name, session?.user?.email)

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-6">
      <div>
        <h2 className="text-3xl font-bold">My Profile</h2>
        <p className="text-muted-foreground">Update your personal information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Manage your name, avatar, and password</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
          ) : (
            <form onSubmit={onSave} className="space-y-4">
              <div className="flex items-center gap-4">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="Avatar" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-muted text-base font-medium flex items-center justify-center">
                    {initials}
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  <div>{session?.user?.name || "User"}</div>
                  <div>{session?.user?.email}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input value={email} disabled />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Avatar URL</label>
                <Input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Current Password</label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">New Password</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 4 characters" required />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={savingPwd}>
                {savingPwd && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
