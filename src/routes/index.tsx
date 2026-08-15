import { createFileRoute, redirect } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    throw redirect({
      to: user ? "/dashboard" : "/auth",
    })
  },
})