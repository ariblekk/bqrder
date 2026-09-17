import { cn } from 'cn'
import { Badge } from './badge'

const colors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  paid: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-red-100 text-red-800',
  unpaid: 'bg-muted text-muted-foreground',
}

export function StatusTag({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={cn('border-transparent', colors[status])}>
      {status}
    </Badge>
  )
}
