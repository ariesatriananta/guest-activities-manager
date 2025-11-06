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

export const metadata: Metadata = {
  title: "Guest Activities",
  description: "Hotel guest daily activities management system",
  generator: "dino-apps",
  manifest: "/manifest.webmanifest",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
  icons: {
    icon: [
      { url: "/placeholder-logo.png", type: "image/png", sizes: "192x192" },
      { url: "/placeholder.jpg", type: "image/jpeg", sizes: "512x512" },
    ],
    apple: [
      { url: "/placeholder-logo.png" },
    ],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
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
