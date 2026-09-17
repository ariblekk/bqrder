import { Outlet, useNavigate } from "react-router-dom"

import { AppSidebar } from "../components/app-sidebar"
import { Separator } from "../components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "../components/ui/sidebar"
import { useAuth } from "../context/AuthContext"
import { AdminHeaderProvider, useAdminHeader } from "./AdminHeaderContext"

function Shell() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const { header } = useAdminHeader()

  return (
    <SidebarProvider>
      <AppSidebar
        user={user ?? { name: "bqrder", role: "" }}
        onLogout={() => {
          logout()
          nav("/login")
        }}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <span className="font-medium">{header.title}</span>
          <div className="ml-auto flex items-center gap-3">{header.action}</div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function AdminLayout() {
  return (
    <AdminHeaderProvider>
      <Shell />
    </AdminHeaderProvider>
  )
}