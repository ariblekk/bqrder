import { useState } from 'react'
import { get } from '../api/client'
import type { CustomReport, DailySales, SalesSummary, TopProduct } from '../api/types'
import { Button, Card, CardContent, Empty, EmptyContent, EmptyDescription, Input, Select } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { usePageTitle } from '../hooks/usePageTitle'

const periodOptions = [
  { value: 'daily', label: 'Harian' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'custom', label: 'Rentang tanggal' },
]

type Period = 'daily' | 'monthly' | 'custom'
interface Applied {
  period: Period
  start: string
  end: string
}

function ReportControls({ initial, onApply, onRefresh }: {
  initial: Applied
  onApply: (a: Applied) => void
  onRefresh: () => void
}) {
  const [period, setPeriod] = useState<Period>(initial.period)
  const [start, setStart] = useState(initial.start)
  const [end, setEnd] = useState(initial.end)
  return (
    <>
      <div className="w-40">
        <Select
          value={period}
          onValueChange={(v) => {
            const p = v as Period
            setPeriod(p)
            if (p !== 'custom') onApply({ period: p, start, end })
          }}
          options={periodOptions}
        />
      </div>
      {period === 'custom' && (
        <>
          <Input
            className="w-40"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <Input
            className="w-40"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
          <Button disabled={!start || !end} onClick={() => onApply({ period, start, end })}>
            Lihat
          </Button>
        </>
      )}
      <Button variant="outline" onClick={onRefresh}>
        Segarkan
      </Button>
    </>
  )
}

export default function Reports() {
  const [applied, setApplied] = useState<Applied>({ period: 'daily', start: '', end: '' })
  const { data, err, reload } = useAsync(async () => {
    const { period, start, end } = applied
    if (period === 'daily') return { summary: (await get<SalesSummary>('/admin/reports/sales?period=daily')).data }
    if (period === 'monthly') return { summary: (await get<SalesSummary>('/admin/reports/sales?period=monthly')).data }
    if (start && end) {
      const r = await get<CustomReport>(`/admin/reports/sales?start_date=${start}&end_date=${end}`).then((x) => x.data)
      return { summary: r.summary, daily: r.daily_sales, top: r.top_products }
    }
    return {}
  }, [applied])

  usePageTitle(
    'Laporan Penjualan',
    <ReportControls initial={applied} onApply={setApplied} onRefresh={reload} />,
  )

  const s = data?.summary as SalesSummary | undefined

  return (
    <>
      {err && <p className="text-sm font-medium text-destructive">{err}</p>}
      {s && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card size="sm">
            <CardContent className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Pesanan</span>
              <strong className="text-xl font-semibold">{s.total_orders}</strong>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Revenue</span>
              <strong className="text-xl font-semibold">Rp {s.total_revenue.toLocaleString('id-ID')}</strong>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Rata-rata</span>
              <strong className="text-xl font-semibold">Rp {s.average_order_value.toLocaleString('id-ID')}</strong>
            </CardContent>
          </Card>
        </div>
      )}
      {data?.daily && (data.daily.length ? (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tanggal</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Pesanan</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(data.daily as DailySales[]).map((d) => (
                <tr key={d.date} className="border-b last:border-0">
                  <td className="px-3 py-2">{d.date}</td>
                  <td className="px-3 py-2">{d.total_orders}</td>
                  <td className="px-3 py-2">Rp {d.total_revenue.toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>
          <EmptyContent>
            <EmptyDescription>Tidak ada penjualan di periode ini.</EmptyDescription>
          </EmptyContent>
        </Empty>
      ))}
      {data?.top && (data.top.length ? (
        <>
          <h3 className="text-lg font-semibold">Produk Terlaris</h3>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Produk</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Terjual</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(data.top as TopProduct[]).map((t) => (
                  <tr key={t.product_id} className="border-b last:border-0">
                    <td className="px-3 py-2">{t.product_name}</td>
                    <td className="px-3 py-2">{t.total_sold}</td>
                    <td className="px-3 py-2">Rp {t.total_revenue.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <Empty>
          <EmptyContent>
            <EmptyDescription>Belum ada produk terjual.</EmptyDescription>
          </EmptyContent>
        </Empty>
      ))}
    </>
  )
}