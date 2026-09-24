import { Calculator, LayoutDashboard, Package, Rows3, ShoppingCart, Store, Tags, UserRound } from "lucide-react"
import type { ComponentProps } from "react"

import { get } from "@/api/client"
import type { Branch } from "@/api/types"
import { BranchSelect } from "@/components/BranchSelect"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { useAsync } from "@/hooks/useAsync"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

export const navItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Meja", url: "/admin/tables", icon: Rows3 },
  { title: "Kategori", url: "/admin/categories", icon: Tags },
  { title: "Produk", url: "/admin/products", icon: Package },
  { title: "User", url: "/admin/users", icon: UserRound },
  { title: "Laporan", url: "/admin/reports", icon: Calculator },
  { title: "Cabang", url: "/admin/branches", icon: Store, super: true },
  { title: "POS", url: "/pos", icon: ShoppingCart },
]

function BranchHeader() {
  const { data } = useAsync(() => get<Branch>("/admin/branch").then((r) => r.data), [])
  if (!data) return null
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" className="pointer-events-none">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Store className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{data.name}</span>
            <span className="truncate text-xs">{data.address || "Cabang aktif"}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function AppSidebar({
  user,
  onLogout,
  ...props
}: { user: { name: string; role: string; email: string }; onLogout: () => void } & ComponentProps<
  typeof Sidebar
>) {
  const items = user.role === "super_admin" ? navItems : navItems.filter((i) => !i.super)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {user.role === "super_admin" ? <BranchSelect /> : <BranchHeader />}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onLogout={onLogout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}