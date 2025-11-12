import type React from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      <Header />
      <div className="flex items-center justify-center py-20 px-4">{children}</div>
      <Footer />
    </main>
  )
}
