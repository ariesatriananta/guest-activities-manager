"use client"

import { useEffect } from "react"

export function SWRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    // In development: actively unregister any existing service workers to avoid stale caches
    if (process.env.NODE_ENV !== "production") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations?.().then((regs) => {
          regs.forEach((r) => r.unregister())
        })
      }
      // also try to clear our known cache names (best-effort)
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((k) => {
            if (k.startsWith("amanjiwo-cache-")) caches.delete(k)
          })
        })
      }
      return
    }
    if (!("serviceWorker" in navigator)) return
    const swUrl = "/sw.js"
    const register = async () => {
      try {
        await navigator.serviceWorker.register(swUrl)
      } catch (e) {
        // noop
      }
    }
    register()
  }, [])

  return null
}
