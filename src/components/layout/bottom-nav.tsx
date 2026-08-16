import { Link } from "@tanstack/react-router"
import { LayoutGrid, ListChecks, Target } from "lucide-react"

const items = [
  { to: "/dashboard" as const, label: "Dashboard", icon: LayoutGrid },
  { to: "/transactions" as const, label: "Transactions", icon: ListChecks },
  { to: "/budgets" as const, label: "Budgets", icon: Target },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-black/5 bg-[#EEF7F4]/95 py-2 backdrop-blur md:hidden dark:border-white/5 dark:bg-[#0E1614]/95">
      {items.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-col items-center gap-0.5 px-4 py-1 text-xs text-muted-foreground"
          activeProps={{ className: "text-teal-600 dark:text-teal-300" }}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  )
}