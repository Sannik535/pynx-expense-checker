import { useEffect, useState, useCallback, useMemo } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { ArrowDown, ArrowUp, Download, Search } from "lucide-react"

import { AddExpenseDialog } from "@/components/transactions/add-expense-dialog"
import { AppHeader } from "@/components/layout/app-header"
import { BottomNav } from "@/components/layout/bottom-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/transactions")({
  component: TransactionsPage,
})

type Transaction = {
  id: number
  category_id: number | null
  type: "income" | "expense"
  amount: number
  description: string | null
  payment_method: string | null
  transaction_date: string
}

type Category = {
  id: number
  name: string
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

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
          .select(
            "id, category_id, type, amount, description, payment_method, transaction_date"
          )
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
    return (id: number | null) =>
      id != null ? map.get(id) ?? "Uncategorized" : "Uncategorized"
  }, [categories])

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (categoryFilter !== "all" && String(t.category_id) !== categoryFilter) {
        return false
      }

      if (search.trim()) {
        const keyword = search.trim().toLowerCase()
        const haystack = `${t.description ?? ""} ${categoryName(t.category_id)}`.toLowerCase()
        if (!haystack.includes(keyword)) return false
      }

      if (fromDate || toDate) {
        const txDate = new Date(t.transaction_date)
        const start = fromDate ? startOfDay(new Date(fromDate)) : new Date(0)
        const end = toDate ? endOfDay(new Date(toDate)) : new Date(8640000000000000)
        if (!isWithinInterval(txDate, { start, end })) return false
      }

      return true
    })
  }, [transactions, categoryFilter, search, fromDate, toDate, categoryName])

  const totalShown = filtered.reduce((sum, t) => {
    return t.type === "income" ? sum + t.amount : sum - t.amount
  }, 0)

  function exportCsv() {
    const header = ["Date", "Category", "Description", "Payment Method", "Type", "Amount"]
    const rows = filtered.map((t) => [
      t.transaction_date,
      categoryName(t.category_id),
      t.description ?? "",
      t.payment_method ?? "",
      t.type,
      t.amount.toString(),
    ])

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#EEF7F4] dark:bg-[#0E1614] text-foreground">
      <AppHeader />

      <main className="mx-auto max-w-7xl space-y-6 p-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">
              {loading ? "…" : filtered.length} shown · {loading ? "…" : formatCurrency(totalShown)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <AddExpenseDialog onExpenseAdded={loadData} />
          </div>
        </div>

        {/* Filters */}
        <Card className="grid gap-4 p-5 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Keyword…"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value ?? "all")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All categories">
                  {(value: string) =>
                    value === "all"
                      ? "All categories"
                      : categories.find((c) => String(c.id) === value)?.name ??
                        "All categories"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">From</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">To</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </Card>

        {/* List */}
        <Card className="p-5">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No transactions match these filters.
            </p>
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/5">
              {filtered.map((t) => (
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
                        {t.description || "—"} · {t.payment_method} ·{" "}
                        {format(new Date(t.transaction_date), "PP")}
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