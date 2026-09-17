"use client"

import { ChevronsUpDown, Store } from 'lucide-react'

import { get, getBranchId, setBranchId } from '../api/client'
import type { Branch } from '../api/types'
import { useAsync } from '../hooks/useAsync'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from './ui/sidebar'

export function BranchSelect() {
  const { data: branches } = useAsync(() => get<Branch[]>('/admin/branches').then((r) => r.data), [])
  const { isMobile } = useSidebar()

  if (!branches?.length) return null

  const current = branches.find((b) => b.id === getBranchId()) ?? branches[0]

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Store className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{current.name}</span>
                <span className="truncate text-xs">{current.address || 'Cabang aktif'}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Pilih cabang
            </DropdownMenuLabel>
            {branches.map((b) => (
              <DropdownMenuItem
                key={b.id}
                onClick={() => {
                  setBranchId(b.id)
                  location.reload()
                }}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <Store className="size-3.5 shrink-0" />
                </div>
                {b.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 p-2">
              <a href="/admin/branches">
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Store className="size-4" />
                </div>
                <span className="font-medium text-muted-foreground">Kelola cabang</span>
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}