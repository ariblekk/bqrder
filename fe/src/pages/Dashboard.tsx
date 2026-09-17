import { useEffect } from 'react'
import { get } from '../api/client'
import type { SalesSummary } from '../api/types'
import { Button, Card, CardContent } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { usePageTitle } from '../hooks/usePageTitle'

export default function Dashboard() {
  const { data, err, reload } = useAsync(
    () => get<SalesSummary>('/admin/reports/sales?period=daily'),
    [],
  )
  const s = data?.data

  usePageTitle('Dashboard', (
    <Button variant="outline" onClick={reload}>
      Segarkan
    </Button>
  ))

  useEffect(() => {
    const t = setInterval(reload, 15000)
    return () => clearInterval(t)
  }, [reload])

  const cards = s
    ? [
        { label: 'Pesanan Hari Ini', value: s.total_orders },
        { label: 'Pendapatan Hari Ini', value: s.total_revenue.toLocaleString('id-ID'), money: true },
        { label: 'Selesai', value: s.completed_orders },
        { label: 'Pending', value: s.pending_orders },
        { label: 'Dibatalkan', value: s.cancelled_orders },
        { label: 'Rata-rata per Pesanan', value: s.average_order_value.toLocaleString('id-ID'), money: true },
      ]
    : []

  return (
    <>
      {err && <p className="text-sm font-medium text-destructive">{err}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label} size="sm">
            <CardContent className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <strong className="text-xl font-semibold">{c.value}</strong>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
