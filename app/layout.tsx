import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/lib/providers"
import "./globals.css"
import { Suspense } from "react"
import { Toaster } from "sonner"
import { SWRegister } from "@/components/sw-register"
import { TopLoader } from "@/components/top-loader"

export const metadata: Metadata = {
  title: "Guest Activities Bookings",
  description: "Hotel guest daily activities management system",
  generator: "dino-apps",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg" },
    ],
    apple: [
      { url: "/icons/icon-180.png", sizes: "180x180" },
    ],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <TopLoader />
        <Providers>
          <Suspense fallback={null}>{children}</Suspense>
        </Providers>
        <SWRegister />
        <Analytics />
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  )
}
