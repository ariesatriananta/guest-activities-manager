"use client"

import type React from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { SessionProvider } from "next-auth/react"

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

  // Note: Seeding via mockDB has been disabled after migrating to Neon DB.

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
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
        storageKey="dino-apps-theme"
      >
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
