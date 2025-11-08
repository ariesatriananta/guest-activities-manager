"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

export function TopLoader() {
  const pathname = usePathname()
  const prevPath = useRef(pathname)
  const [active, setActive] = useState(false)
  const [width, setWidth] = useState(0)
  const timer = useRef<NodeJS.Timeout | null>(null)

  // Start on internal link clicks for snappier feedback
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return
      const anchor = t.closest("a") as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute("href") || ""
      if (!href.startsWith("/")) return
      if (anchor.target === "_blank") return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      setActive(true)
      setWidth(10)
      // progress to 70% while navigating
      timer.current && clearInterval(timer.current)
      timer.current = setInterval(() => {
        setWidth((w) => (w < 70 ? w + 5 : w))
      }, 120)
    }
    document.addEventListener("click", onClick, true)
    const onStart = () => {
      setActive(true)
      setWidth((w) => (w === 0 ? 10 : w))
      timer.current && clearInterval(timer.current)
      timer.current = setInterval(() => setWidth((w) => (w < 85 ? w + 5 : w)), 120)
    }
    const onStop = () => {
      setActive(true)
      setWidth(100)
      setTimeout(() => {
        setActive(false)
        setWidth(0)
        if (timer.current) clearInterval(timer.current)
      }, 250)
    }
    window.addEventListener("toploader:start", onStart as EventListener)
    window.addEventListener("toploader:stop", onStop as EventListener)
    return () => document.removeEventListener("click", onClick, true)
  }, [])

  // Complete when path changes
  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname
      setActive(true)
      setWidth(90)
      setTimeout(() => setWidth(100), 100)
      setTimeout(() => {
        setActive(false)
        setWidth(0)
        if (timer.current) clearInterval(timer.current)
      }, 400)
    }
  }, [pathname])

  if (!active && width === 0) return null

  return (
    <div
      style={{ width: `${width}%` }}
      className="fixed left-0 top-0 z-[100] h-0.5 bg-primary transition-[width,opacity] duration-200"
    />
  )
}
