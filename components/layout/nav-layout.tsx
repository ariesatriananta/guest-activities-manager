"use client"

import React from "react"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSession, signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NavLayoutProps {
  children: React.ReactNode
}

export function NavLayout({ children }: NavLayoutProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/"
    return pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Guest Activities</h1>
              <p className="text-sm text-muted-foreground">Demo Apps for <b>Melissa</b> at AmanJiwo</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {session?.user ? <UserMenu /> : null}
              <Button asChild>
                <Link href="/bookings/new">
                  <Plus className="h-4 w-4 mr-2" />
                  New Booking
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            <Link href="/">
              <Button
                variant="ghost"
                className={cn(
                  "rounded-none border-b-2",
                  isActive("/") && pathname === "/" ? "border-primary" : "border-transparent hover:border-muted",
                )}
              >
                Dashboard
              </Button>
            </Link>
            <Link href="/calendar">
              <Button
                variant="ghost"
                className={cn(
                  "rounded-none border-b-2",
                  isActive("/calendar") ? "border-primary" : "border-transparent hover:border-muted",
                )}
              >
                Calendar
              </Button>
            </Link>
            <Link href="/bookings">
              <Button
                variant="ghost"
                className={cn(
                  "rounded-none border-b-2",
                  isActive("/bookings") ? "border-primary" : "border-transparent hover:border-muted",
                )}
              >
                Bookings
              </Button>
            </Link>
            {role === "admin" && (
            <Link href="/reports">
              <Button
                variant="ghost"
                className={cn(
                  "rounded-none border-b-2",
                  isActive("/reports") ? "border-primary" : "border-transparent hover:border-muted",
                )}
              >
                Reports
              </Button>
            </Link>
            )}
            {role === "admin" && (
            <Link href="/settings">
              <Button
                variant="ghost"
                className={cn(
                  "rounded-none border-b-2",
                  isActive("/settings") ? "border-primary" : "border-transparent hover:border-muted",
                )}
              >
                Settings
              </Button>
            </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>

      <footer className="border-t border-border bg-card mt-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>Guest Activities Manager © 2025</p>
            <ThemeBadge />
          </div>
        </div>
      </footer>
    </div>
  )
}

function ThemeBadge() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <span className="text-xs px-2 py-1 rounded-md bg-muted">
      Theme:{" "}
      <span className="font-mono">
        {typeof window !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light"}
      </span>
    </span>
  )
}

function getInitials(name?: string | null, email?: string | null) {
  const src = (name && name.trim()) || (email && email.split("@")[0]) || "User"
  const parts = src.split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] || "U"
  const second = parts.length > 1 ? parts[1]?.[0] : ""
  return (first + second).toUpperCase()
}

function UserMenu() {
  const { data } = useSession()
  const user = data?.user
  const role = (user as any)?.role as string | undefined
  const initials = getInitials(user?.name, user?.email)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1 hover:bg-accent/50"
          aria-label="User menu"
        >
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name || user.email || "User"} className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <div className="h-7 w-7 rounded-full bg-muted text-xs font-medium flex items-center justify-center">
              {initials}
            </div>
          )}
          <span className="text-sm max-sm:hidden">{user?.name || user?.email}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>
          <div className="flex items-center gap-3">
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt={user.name || user.email || "User"} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-muted text-sm font-medium flex items-center justify-center">
                {initials}
              </div>
            )}
            <div className="space-y-0.5">
              <div className="text-sm font-medium leading-none">{user?.name || "User"}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
              {role && <div className="text-xs text-muted-foreground">Role: {role}</div>}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">My Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
