"use client"

import React from "react"

import { Button } from "@/components/ui/button"
import { Plus, Moon, Sun, Cog } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { Logo } from "@/components/logo"
import { useSession, signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { ClientOnly } from "@/components/client-only"

interface NavLayoutProps {
  children: React.ReactNode
}

export function NavLayout({ children }: NavLayoutProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined
  const navRef = React.useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = React.useState<{ left: number; width: number }>({ left: 0, width: 0 })
  const [noTransition, setNoTransition] = React.useState(true)
  const [navPending, setNavPending] = React.useState(false)
  

  React.useEffect(() => {
    const el = navRef.current
    if (!el) return
    const update = () => {
      const active = el.querySelector<HTMLElement>("[data-active='true']")
      if (!active) return
      const targetLeft = active.offsetLeft - (el.clientWidth - active.clientWidth) / 2
      el.scrollTo({ left: Math.max(targetLeft, 0), behavior: "smooth" })
      setIndicator({ left: active.offsetLeft, width: active.offsetWidth })
    }
    update()
    // enable animation after first paint so it doesn't animate from 0
    requestAnimationFrame(() => setNoTransition(false))
    const onResize = () => update()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [pathname])

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/"
    return pathname.startsWith(path)
  }

  const onNavClick = () => {
    setNavPending(true)
    // will reset on pathname change
  }

  React.useEffect(() => {
    // reset pending when route changes
    setNavPending(false)
  }, [pathname])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header suppressHydrationWarning className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm h-16 md:h-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center h-full">
              <Link href="/" aria-label="Go to Dashboard" className="inline-flex items-center">
                <Logo />
              </Link>
              <p className="text-sm text-muted-foreground max-sm:hidden ml-2">Guest Activities Manager</p>
            </div>
            <ClientOnly>
              <div className="flex items-center gap-2">
                {session?.user ? <UserMenu /> : null}
                {/* Admin settings shortcut on mobile */}
                {role === "admin" ? (
                  <Button asChild size="icon-sm" variant="outline" className="sm:hidden" disabled={navPending}>
                    <Link href="/settings" aria-label="Settings" onClick={onNavClick}>
                      <Cog className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
                <Button asChild className="hidden sm:inline-flex" disabled={navPending}>
                  <Link href="/bookings/new" onClick={onNavClick}>
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="max-sm:hidden">Booking</span>
                  </Link>
                </Button>
              </div>
            </ClientOnly>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav suppressHydrationWarning className="hidden sm:block border-b border-border bg-card sticky top-16 md:top-20 z-40 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-2 md:py-2">
          <div ref={navRef} className="relative flex items-center gap-1 overflow-x-auto no-scrollbar">
                <Link href="/" onClick={onNavClick}>
                  <Button
                    variant="ghost"
                    className={cn("rounded-none border-b-2 border-transparent hover:border-muted", isActive("/") && pathname === "/" ? "text-primary" : undefined)}
                    data-active={isActive("/") && pathname === "/" ? "true" : undefined}
                    disabled={navPending}
                  >
                    Dashboard
                  </Button>
                </Link>
                <Link href="/calendar" onClick={onNavClick}>
                  <Button
                    variant="ghost"
                    className={cn("rounded-none border-b-2 border-transparent hover:border-muted", isActive("/calendar") ? "text-primary" : undefined)}
                    data-active={isActive("/calendar") ? "true" : undefined}
                    disabled={navPending}
                  >
                    Timeline
                  </Button>
                </Link>
                <Link href="/bookings" onClick={onNavClick}>
                  <Button
                    variant="ghost"
                    className={cn("rounded-none border-b-2 border-transparent hover:border-muted", isActive("/bookings") ? "text-primary" : undefined)}
                    data-active={isActive("/bookings") ? "true" : undefined}
                    disabled={navPending}
                  >
                    Bookings
                  </Button>
                </Link>
                {(role === "admin" || role === "staff") && (
                <Link href="/reports" onClick={onNavClick}>
                  <Button
                    variant="ghost"
                    className={cn("rounded-none border-b-2 border-transparent hover:border-muted", isActive("/reports") ? "text-primary" : undefined)}
                    data-active={isActive("/reports") ? "true" : undefined}
                    disabled={navPending}
                  >
                    Reports
                  </Button>
                </Link>
                )}
                {role === "admin" && (
                <Link href="/settings" onClick={onNavClick}>
                  <Button
                    variant="ghost"
                    className={cn("rounded-none border-b-2 border-transparent hover:border-muted", isActive("/settings") ? "text-primary" : undefined)}
                    data-active={isActive("/settings") ? "true" : undefined}
                    disabled={navPending}
                  >
                    Settings
                  </Button>
                </Link>
                )}
                <div
                  className={cn(
                    "pointer-events-none absolute bottom-0 h-[2px] bg-primary rounded",
                    noTransition ? "transition-none" : "transition-all duration-300 ease-out",
                  )}
                  style={{ left: indicator.left, width: indicator.width }}
                />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pb-24 sm:pb-0">{children}</main>

      <footer className="border-t border-border bg-card mt-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <p>Guest Activities Manager © 2025</p>
            <ThemeBadge />
          </div>
        </div>
      </footer>
      {/* Mobile Bottom Nav */}
      <MobileBottomNav />
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
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const isDark = mounted && resolvedTheme === "dark"
  const nextTheme = isDark ? "light" : "dark"
  const ThemeIcon = isDark ? Sun : Moon

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
        <DropdownMenuItem
          onClick={() => {
            if (!mounted) return
            setTheme(nextTheme)
          }}
          className="flex items-center justify-between gap-2"
        >
          <span>
            {mounted ? (isDark ? "Theme Light" : "Theme Dark") : "Theme"}
          </span>
          <ThemeIcon className="h-4 w-4" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
