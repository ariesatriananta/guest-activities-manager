"use client"

import type React from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { seed } from "@/lib/data/mockDB"
import { ThemeProvider } from "@/components/theme-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  useEffect(() => {
    // Initialize database with seed data if empty
    const initDB = async () => {
      const stored = localStorage.getItem("guest-activities-db")
      if (!stored) {
        await seed()
      }
    }
    initDB()
  }, [])

  // Hide Next.js dev toolbar (floating "N" button) permanently
  useEffect(() => {
    const hideToolbar = () => {
      const selectors = [
        '#nextjs-portal',
        '[data-nextjs-portal]',
        '[data-nextjs-toolbar]',
        '[data-nextjs-floating]',
        'button[aria-label*="Next.js" i]',
        '[aria-label*="Next.js Toolbar" i]'
      ]
      for (const sel of selectors) {
        document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
          el.style.setProperty('display', 'none', 'important')
          el.setAttribute('hidden', 'true')
        })
      }
    }

    hideToolbar()

    const observer = new MutationObserver(() => hideToolbar())
    observer.observe(document.documentElement, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      storageKey="dino-apps-theme"
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  )
}
