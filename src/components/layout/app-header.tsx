import { Link, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Moon, Sun, LogOut, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

export function AppHeader() {
  const navigate = useNavigate()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    const dark = stored === "dark"
    setIsDark(dark)
    document.documentElement.classList.toggle("dark", dark)
  }, [])

  function toggleTheme() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("theme", next ? "dark" : "light")
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate({ to: "/auth" })
  }

  return (
    <header className="border-b border-black/5 bg-[#EEF7F4]/80 backdrop-blur dark:bg-[#0E1614]/80 dark:border-white/5">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-teal-700 dark:text-teal-300">
          <Wallet className="h-5 w-5" />
          Pynx
        </div>

        <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
          <Link
            to="/dashboard"
            className="rounded-full px-4 py-1.5 text-muted-foreground hover:text-foreground"
            activeProps={{ className: "bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-100" }}
          >
            Dashboard
          </Link>
          <Link
            to="/transactions"
            className="rounded-full px-4 py-1.5 text-muted-foreground hover:text-foreground"
            activeProps={{ className: "bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-100" }}
          >
            Transactions
          </Link>
          <Link
            to="/budgets"
            className="rounded-full px-4 py-1.5 text-muted-foreground hover:text-foreground"
            activeProps={{ className: "bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-100" }}
          >
            Budgets
          </Link>
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={toggleTheme}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}