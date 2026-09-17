import { useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from './button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader } from './empty'
import { Input } from './input'

interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[]
  data: T[]
  searchable?: boolean
  pageSize?: number
  globalFilter?: string
  onGlobalFilterChange?: (v: string) => void
}

export function DataTable<T>({
  columns,
  data,
  searchable = true,
  pageSize = 10,
  globalFilter,
  onGlobalFilterChange,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [local, setLocal] = useState('')
  const filter = globalFilter ?? local
  const setFilter = onGlobalFilterChange ?? setLocal

  const table = useReactTable<T>({
    data,
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: (updater) =>
      setFilter(typeof updater === 'function' ? updater(filter) : updater),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  return (
    <div>
      {searchable && !onGlobalFilterChange && (
        <Input
          placeholder="Cari..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mb-3 max-w-xs"
        />
      )}
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b bg-muted/50">
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-3 py-2 text-left font-medium text-muted-foreground">
                    {h.column.getCanSort() ? (
                      <button
                        className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground"
                        onClick={h.column.getToggleSortingHandler()}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === 'asc' && <ChevronUp className="size-3.5" />}
                        {h.column.getIsSorted() === 'desc' && <ChevronDown className="size-3.5" />}
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
{!table.getRowModel().rows.length && (
            <Empty>
              <EmptyHeader>
                <EmptyContent>
                  <EmptyDescription>Tidak ada data.</EmptyDescription>
                </EmptyContent>
              </EmptyHeader>
            </Empty>
          )}
      {table.getPageCount() > 1 && (
        <div className="my-4 flex items-center justify-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Hal {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Berikutnya
          </Button>
        </div>
      )}
    </div>
  )
}
