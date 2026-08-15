import { useEffect, useState, useCallback, useMemo } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns"
import {
  Bus,
  Clapperboard,
  FileText,
  GraduationCap,
  HeartPulse,
  Home,
  Moon,
  LogOut,
  Package,
  ShoppingBag,
  Sun,
  Utensils,
  Wallet,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/budgets")({
  component: BudgetsPage,
})

type Category = {
  id: number
  name: string
}

type Budget = {
  id: number
  category_id: number
  amount: number
}

type Transaction = {
  category_id: number | null
  type: "income" | "expense"
  amount: number
  transaction_date: string
}

const CATEGORY_ICON: Record<string, { icon: typeof Utensils; className: string }> = {
  food: { icon: Utensils, className: "bg-orange-100 text-orange-600" },
  transport: { icon: Bus, className: "bg-sky-100 text-sky-600" },
  shopping: { icon: ShoppingBag, className: "bg-purple-100 text-purple-600" },
  housing: { icon: Home, className: "bg-amber-100 text-amber-600" },
  bills: { icon: FileText, className: "bg-indigo-100 text-indigo-600" },
  entertainment: { icon: Clapperboard, className: "bg-rose-100 text-rose-600" },
  health: { icon: HeartPulse, className: "bg-emerald-100 text-emerald-600" },
  education: { icon: GraduationCap, className: "bg-cyan-100 text-cyan-600" },
  other: { icon: Package, className: "bg-slate-100 text-slate-600" },
}

function getCategoryIcon(name: string) {
  return (
    CATEGORY_ICON[name.toLowerCase()] ?? {
      icon: Wallet,
      className: "bg-slate-100 text-slate-600",
    }
  )
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function BudgetsPage() {
  const navigate = useNavigate()

  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [inputs, setInputs] = useState<Record<number, string>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
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

  const monthStart = startOfMonth(new Date())
  const monthKey = format(monthStart, "yyyy-MM-dd")

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const [catRes, budgetRes, txRes] = await Promise.all([
      supabase.from("categories").select("id, name").order("name"),
      supabase
        .from("budgets")
        .select("id, category_id, amount")
        .eq("user_id", user.id)
        .eq("month", monthKey),
      supabase
        .from("transactions")
        .select("category_id, type, amount, transaction_date")
        .eq("user_id", user.id),
    ])

    if (catRes.error) console.error(catRes.error.message)
    if (budgetRes.error) console.error(budgetRes.error.message)
    if (txRes.error) console.error(txRes.error.message)

    setCategories(catRes.data ?? [])
    setBudgets(budgetRes.data ?? [])
    setTransactions(txRes.data ?? [])

    const nextInputs: Record<number, string> = {}
    for (const b of budgetRes.data ?? []) {
      nextInputs[b.category_id] = String(b.amount)
    }
    setInputs(nextInputs)

    setLoading(false)
  }, [monthKey])

  useEffect(() => {
    loadData()
  }, [loadData])

  const spentByCategory = useMemo(() => {
    const range = { start: monthStart, end: endOfMonth(monthStart) }
    const totals = new Map<number, number>()

    for (const t of transactions) {
      if (t.type !== "expense" || t.category_id == null) continue
      if (!isWithinInterval(new Date(t.transaction_date), range)) continue
      totals.set(t.category_id, (totals.get(t.category_id) ?? 0) + t.amount)
    }

    return totals
  }, [transactions, monthStart])

  const budgetByCategory = useMemo(() => {
    const map = new Map<number, Budget>()
    for (const b of budgets) map.set(b.category_id, b)
    return map
  }, [budgets])

  async function handleSave(categoryId: number) {
    const raw = inputs[categoryId]
    const amount = Number(raw)

    if (!raw || isNaN(amount) || amount < 0) return

    setSavingId(categoryId)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setSavingId(null)
      return
    }

    const existing = budgetByCategory.get(categoryId)

    if (existing) {
      const { error } = await supabase
        .from("budgets")
        .update({ amount })
        .eq("id", existing.id)

      if (error) console.error(error.message)
    } else {
      const { error } = await supabase.from("budgets").insert({
        user_id: user.id,
        category_id: categoryId,
        amount,
        month: monthKey,
      })

      if (error) console.error(error.message)
    }

    await loadData()
    setSavingId(null)
  }

  return (
    <div className="min-h-screen bg-[#EEF7F4] dark:bg-[#0E1614] text-foreground">
      {/* Nav */}
      <header className="border-b border-black/5 bg-[#EEF7F4]/80 backdrop-blur dark:bg-[#0E1614]/80 dark:border-white/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-teal-700 dark:text-teal-300">
            <Wallet className="h-5 w-5" />
            Pynx
          </div>

          <nav className="flex items-center gap-1 text-sm font-medium">
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
              className="rounded-full px-4 py-1.5 text-teal-800 dark:text-teal-100"
              activeProps={{ className: "bg-teal-100 dark:bg-teal-900/50" }}
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

      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly budgets</h1>
          <p className="text-muted-foreground">
            Set a limit per category. Bars turn red when you go over.
          </p>
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {categories.map((category) => {
              const { icon: Icon, className } = getCategoryIcon(category.name)
              const spent = spentByCategory.get(category.id) ?? 0
              const budget = budgetByCategory.get(category.id)
              const limit = budget?.amount ?? null
              const percent = limit ? Math.min((spent / limit) * 100, 100) : 0
              const overBudget = limit != null && spent > limit

              return (
                <Card key={category.id} className="space-y-4 p-5">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full",
                        className
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <h2 className="font-semibold">{category.name}</h2>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span>{formatCurrency(spent)} spent</span>
                    <span
                      className={cn(
                        "text-muted-foreground",
                        overBudget && "font-medium text-rose-600"
                      )}
                    >
                      {limit == null
                        ? "no budget set"
                        : overBudget
                        ? `${formatCurrency(spent - limit)} over`
                        : `${formatCurrency(limit)} limit`}
                    </span>
                  </div>

                  <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10">
                    <div
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        overBudget ? "bg-rose-500" : "bg-teal-500"
                      )}
                      style={{ width: `${limit == null ? 0 : percent}%` }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Monthly limit"
                      value={inputs[category.id] ?? ""}
                      onChange={(e) =>
                        setInputs((prev) => ({
                          ...prev,
                          [category.id]: e.target.value,
                        }))
                      }
                    />
                    <Button
                      variant="secondary"
                      onClick={() => handleSave(category.id)}
                      disabled={savingId === category.id}
                    >
                      {savingId === category.id ? "…" : "Save"}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}