"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Calendar, ClipboardList, BarChart3, CalendarPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"

function NavItem({ href, label, icon: Icon, active, className }: { href: string; label: string; icon: any; active: boolean; className?: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center py-2 px-2 text-xs",
        active ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {active ? (
        <span className="mb-1 h-1.5 w-1.5 rounded-full bg-primary" />
      ) : (
        <span className="mb-1 h-1.5 w-1.5 rounded-full opacity-0" />
      )}
      <Icon className={cn("h-5 w-5")} />
      <span className="mt-1 leading-none">{label}</span>
    </Link>
  )
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined

  // Only show when logged in
  if (!session?.user) return null

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/"
    return pathname.startsWith(path)
  }

  const canSeeReports = role === "admin" || role === "staff"

  return (
    <div className="sm:hidden fixed bottom-4 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-7xl px-4">
        <div className="relative border border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 rounded-2xl shadow-xl px-2 pt-3 pb-2 after:content-[''] after:absolute after:-top-1 after:left-0 after:right-0 after:h-1 after:bg-gradient-to-b after:from-foreground/5 after:to-transparent after:rounded-t-2xl after:pointer-events-none">
          {/* Center primary action */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2">
            <Link
              href="/bookings/new"
              className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl ring-4 ring-background"
              aria-label="New Booking"
            >
              <CalendarPlus className="h-7 w-7" />
            </Link>
          </div>

          {/* Left/Right items */}
          <div className="grid grid-cols-4 items-end">
            <NavItem href="/" label="Dashboard" icon={Home} active={isActive("/") && pathname === "/"} />
            <NavItem href="/calendar" label="Timeline" icon={Calendar} active={isActive("/calendar")} className="mr-6" />
            <NavItem href="/bookings" label="Booking" icon={ClipboardList} active={isActive("/bookings")} className="ml-6" />
            {canSeeReports ? (
              <NavItem href="/reports" label="Report" icon={BarChart3} active={isActive("/reports")} />
            ) : (
              <span />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
