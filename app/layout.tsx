import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import BridgeInit from "@/components/BridgeInit"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Work Flow Pulse - Internal Service Request Management",
  description:
    "Mobile-first internal solution for employees to submit and manage cleaning and maintenance requests across office buildings.",
  keywords: "Work Flow Pulse, service requests, maintenance, internal app",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className={inter.className}>
        <BridgeInit />
        {children}
      </body>
    </html>
  )
}
