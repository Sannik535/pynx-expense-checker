import { createFileRoute, redirect, Outlet } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw redirect({
        to: "/auth",
      })
    }

    return {
      user,
    }
  },

  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return <Outlet />
}