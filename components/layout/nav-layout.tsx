"use client"

import React from "react"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"

interface NavLayoutProps {
  children: React.ReactNode
}

export function NavLayout({ children }: NavLayoutProps) {
  const pathname = usePathname()

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
          <div className="flex gap-1 overflow-x-auto">
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
