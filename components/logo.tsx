import React from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  imgClassName?: string
  alt?: string
}

export function Logo({ className, imgClassName, alt = "Amanjiwo" }: LogoProps) {
  return (
    <div className={cn("select-none", className)}>
      {/* Light theme logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo/logo-main.png"
        alt={alt}
        className={cn("h-8 md:h-10 w-auto block dark:hidden", imgClassName)}
      />
      {/* Dark theme logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo/logo-white.png"
        alt={alt}
        className={cn("h-8 md:h-10 w-auto hidden dark:block", imgClassName)}
      />
    </div>
  )
}

