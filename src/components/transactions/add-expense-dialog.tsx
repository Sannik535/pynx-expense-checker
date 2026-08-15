import { useEffect, useState } from "react"
import { CalendarIcon, Plus } from "lucide-react"
import { format } from "date-fns"

import { supabase } from "@/lib/supabase"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type Category = {
  id: number
  name: string
}

const paymentMethods = [
  "Cash",
  "UPI",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
]

interface AddExpenseDialogProps {
  onExpenseAdded?: () => void
}

export function AddExpenseDialog({
  onExpenseAdded,
}: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false)

  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [description, setDescription] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [date, setDate] = useState<Date>(new Date())

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Load categories from Supabase when the dialog opens
  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name")

      if (error) {
        setError(error.message)
        return
      }

      setCategories(data ?? [])
    }

    if (open) {
      loadCategories()
    }
  }, [open])

  async function handleSubmit() {
    setError("")

    const numericAmount = Number(amount)

    if (!numericAmount || numericAmount <= 0) {
      setError("Enter a valid amount.")
      return
    }

    if (!categoryId) {
      setError("Select a category.")
      return
    }

    if (!paymentMethod) {
      setError("Select a payment method.")
      return
    }

    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError("You must be logged in.")
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        category_id: Number(categoryId),
        type: "expense",
        amount: numericAmount,
        description: description || null,
        payment_method: paymentMethod,
        transaction_date: format(date, "yyyy-MM-dd"),
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    // Reset form
    setAmount("")
    setCategoryId("")
    setDescription("")
    setPaymentMethod("")
    setDate(new Date())
    setError("")

    setOpen(false)
    setLoading(false)

    onExpenseAdded?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Amount
            </label>

            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="₹0.00"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value)
              }
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Category
            </label>

            <Select
              value={categoryId}
              onValueChange={(value) => setCategoryId(value ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category">
                  {(value: string) =>
                    categories.find((c) => String(c.id) === value)?.name ??
                    "Select category"
                  }
                </SelectValue>
              </SelectTrigger>

              <SelectContent>
                {categories.map((category) => (
                  <SelectItem
                    key={category.id}
                    value={String(category.id)}
                  >
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Payment method
            </label>

            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>

              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Date
            </label>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "PPP")}
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(selectedDate) => {
                    if (selectedDate) {
                      setDate(selectedDate)
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Description
            </label>

            <Textarea
              placeholder="What did you spend it on?"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Expense"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}