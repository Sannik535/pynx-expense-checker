import { useEffect, useState, useCallback, useMemo } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  subDays,
  eachDayOfInterval,
  format,
} from "date-fns"
import { ArrowDown, ArrowUp, CalendarDays, Repeat, Wallet } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

import { AddExpenseDialog } from "@/components/transactions/add-expense-dialog"
import { AppHeader } from "@/components/layout/app-header"
import { BottomNav } from "@/components/layout/bottom-nav"
import { Card } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
})

type Transaction = {
  id: number
  category_id: number | null
  type: "income" | "expense"
  amount: number
  description: string | null
  transaction_date: string
}

type Category = {
  id: number
  name: string
}

type Period = "week" | "month"

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>("month")

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const [{ data: txData, error: txError }, { data: catData, error: catError }] =
      await Promise.all([
        supabase
          .from("transactions")
          .select("id, category_id, type, amount, description, transaction_date")
          .eq("user_id", user.id)
          .order("transaction_date", { ascending: false }),
        supabase.from("categories").select("id, name").order("name"),
      ])

    if (txError) console.error(txError.message)
    if (catError) console.error(catError.message)

    setTransactions(txData ?? [])
    setCategories(catData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]))
    return (id: number | null) => (id != null ? map.get(id) ?? "Uncategorized" : "Uncategorized")
  }, [categories])

  const now = new Date()

  const periodRange = useMemo(() => {
    return period === "week"
      ? { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
      : { start: startOfMonth(now), end: endOfMonth(now) }
  }, [period])

  const periodTransactions = useMemo(
    () =>
      transactions.filter((t) =>
        isWithinInterval(new Date(t.transaction_date), periodRange)
      ),
    [transactions, periodRange]
  )

  const spentThisPeriod = useMemo(
    () =>
      periodTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0),
    [periodTransactions]
  )

  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, number>()
    let grandTotal = 0

    for (const t of periodTransactions) {
      if (t.type !== "expense") continue
      const name = categoryName(t.category_id)
      totals.set(name, (totals.get(name) ?? 0) + t.amount)
      grandTotal += t.amount
    }

    return Array.from(totals.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percent: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)
  }, [periodTransactions, categoryName])

  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(now, 29), end: now })

    return days.map((day) => {
      const key = format(day, "yyyy-MM-dd")
      const total = transactions
        .filter((t) => t.type === "expense" && t.transaction_date === key)
        .reduce((sum, t) => sum + t.amount, 0)

      return { date: format(day, "MM-dd"), amount: total }
    })
  }, [transactions])

  const recentTransactions = transactions.slice(0, 5)

  const periodLabel = period === "week" ? "this week" : "this month"

  return (
    <div className="min-h-screen bg-[#EEF7F4] dark:bg-[#0E1614] text-foreground">
      <AppHeader />

      <main className="mx-auto max-w-7xl space-y-6 p-6 pb-24 md:pb-6">
        {/* Overview header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
            <p className="text-muted-foreground">A calm view of your spending.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-white p-1 shadow-sm dark:bg-white/5">
              <button
                onClick={() => setPeriod("week")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  period === "week"
                    ? "bg-[#EEF7F4] dark:bg-teal-900/50 text-teal-800 dark:text-teal-100"
                    : "text-muted-foreground"
                )}
              >
                Week
              </button>
              <button
                onClick={() => setPeriod("month")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  period === "month"
                    ? "bg-[#EEF7F4] dark:bg-teal-900/50 text-teal-800 dark:text-teal-100"
                    : "text-muted-foreground"
                )}
              >
                Month
              </button>
            </div>

            <AddExpenseDialog onExpenseAdded={loadData} />
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="space-y-2 p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4" />
              Spent {periodLabel}
            </div>
            <div className="text-3xl font-bold">
              {loading ? "…" : formatCurrency(spentThisPeriod)}
            </div>
          </Card>

          <Card className="space-y-2 p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Transactions
            </div>
            <div className="text-3xl font-bold">
              {loading ? "…" : periodTransactions.length}
            </div>
          </Card>

          <Card className="space-y-2 p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Repeat className="h-4 w-4" />
              Recurring
            </div>
            <div className="text-3xl font-bold">₹0.00</div>
          </Card>
        </div>

        {/* By category + chart */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">By category</h2>

            {loading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : categoryBreakdown.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No spending yet {periodLabel}.
              </p>
            ) : (
              <ul className="space-y-3">
                {categoryBreakdown.map((c) => (
                  <li key={c.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{c.name}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(c.amount)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-teal-100 dark:bg-white/10">
                      <div
                        className="h-1.5 rounded-full bg-teal-500"
                        style={{ width: `${c.percent}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-semibold">Last 30 days</h2>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -20, right: 10 }}>
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    interval={6}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    labelClassName="text-xs"
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#0d9488"
                    strokeWidth={2}
                    fill="url(#spendGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Recent transactions */}
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Recent transactions</h2>

          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
          ) : recentTransactions.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nothing here yet — add your first expense.
            </p>
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/5">
              {recentTransactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        t.type === "income"
                          ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
                          : "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300"
                      )}
                    >
                      {t.type === "income" ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {categoryName(t.category_id)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.description || format(new Date(t.transaction_date), "PP")}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      t.type === "income" ? "text-teal-600" : "text-rose-600"
                    )}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {formatCurrency(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>

      <BottomNav />
    </div>
  )
}