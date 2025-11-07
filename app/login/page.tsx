"use client"

import { useState } from "react"
import { signIn, signOut, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const { data: session } = useSession()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    // Jika sudah login sebagai user lain, signOut dulu agar tidak carried-over
    if (session?.user?.email && session.user.email !== email) {
      await signOut({ redirect: false })
    }
    const res = await signIn("credentials", { redirect: false, email, password, callbackUrl })
    setLoading(false)
    if (res?.ok) {
      router.push(callbackUrl)
    } else {
      setError("Email atau password salah.")
    }
  }

  return (
    <div className="min-h-svh flex flex-col p-4 bg-background">
      <div className="flex-1 flex justify-center items-start pt-8 sm:pt-15">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-3">
          {/* Logo center on login */}
          <div className="inline-flex">
            {/* Avoid layout shift by keeping consistent height */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/logo-main.png" alt="Amanjiwo" className="h-10 w-auto block dark:hidden" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/logo-white.png" alt="Amanjiwo" className="h-10 w-auto hidden dark:block" />
          </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mb-4 sm:mb-6">Guest Activities Bookings</p>
          <Card className="w-full">
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>
        </CardContent>
          </Card>
        </div>
      </div>
      <footer className="pt-6">
        <div className="max-w-md mx-auto">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent mb-4" />
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>© {new Date().getFullYear()} Amanjiwo Magelang. All rights reserved.</p>
            <p>Designed exclusively for Melissa — Guest Activities Manager.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
