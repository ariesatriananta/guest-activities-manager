"use client"

import { useEffect } from "react"

export function SWRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
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

