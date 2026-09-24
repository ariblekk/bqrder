import { useState } from "react"
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Search,
  ShoppingBag,
  TrendingUp,
  XCircle,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import { get } from "../api/client"
import type {
  CustomReport,
  DailySales,
  TopProduct,
} from "../api/types"
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DateRangePicker,
  Empty,
  EmptyContent,
  EmptyDescription,
  Select,
} from "../components/ui"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../components/ui/chart"
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { useAsync } from "../hooks/useAsync"
import { usePageTitle } from "../hooks/usePageTitle"
import { formatRupiah } from "../lib/utils"

const periodOptions = [
  { value: "daily", label: "Hari Ini" },
  { value: "monthly", label: "Bulan Ini" },
  { value: "custom", label: "Rentang Tanggal" },
]

type Period = "daily" | "monthly" | "custom"

interface Applied {
  period: Period
  start: string
  end: string
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0]
}

function getFirstDayOfMonthStr() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]
}

function ReportControls({
  initial,
  onApply,
}: {
  initial: Applied
  onApply: (a: Applied) => void
}) {
  const [period, setPeriod] = useState<Period>(initial.period)
  const [start, setStart] = useState(initial.start)
  const [end, setEnd] = useState(initial.end)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={period}
        onValueChange={(v) => {
          const p = v as Period
          setPeriod(p)
          if (p === "daily") {
            const today = getTodayStr()
            onApply({ period: p, start: today, end: today })
          } else if (p === "monthly") {
            onApply({
              period: p,
              start: getFirstDayOfMonthStr(),
              end: getTodayStr(),
            })
          }
        }}
      >
        <SelectTrigger className="h-8 w-40">
          <SelectValue placeholder="Pilih periode" />
        </SelectTrigger>
        <SelectContent>
          {periodOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {period === "custom" && (
        <>
          <DateRangePicker
            value={{ start, end }}
            onChange={({ start: s, end: e }) => {
              setStart(s)
              setEnd(e)
            }}
          />
          <Button
            disabled={!start || !end}
            onClick={() => onApply({ period, start, end })}
            size="default"
            aria-label="Lihat"
            className="h-8 gap-1.5"
          >
            <Search className="size-4" />
            <span>Lihat</span>
          </Button>
        </>
      )}
    </div>
  )
}

const salesChartConfig = {
  total_revenue: {
    label: "Revenue (Rp)",
    color: "var(--chart-1)",
  },
  total_orders: {
    label: "Pesanan",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const topProductChartConfig = {
  total_sold: {
    label: "Jumlah Terjual",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export default function Reports() {
  const today = getTodayStr()
  const [applied, setApplied] = useState<Applied>({
    period: "daily",
    start: today,
    end: today,
  })

  usePageTitle("Laporan Penjualan")

  const { data, err } = useAsync(async () => {
    const { start, end, period } = applied
    const query =
      (period === "custom" || period === "monthly") && start && end
        ? `/admin/reports/sales?start_date=${start}&end_date=${end}`
        : `/admin/reports/sales?period=${period}`

    const res = await get<CustomReport>(query)
    return res.data
  }, [applied])

  const summary = data?.summary
  const dailySales = data?.daily_sales ?? []
  const topProducts = data?.top_products ?? []

  return (
    <div className="space-y-6">
      <ReportControls initial={applied} onApply={setApplied} />

      {err && <p className="text-sm font-medium text-destructive">{err}</p>}

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card size="sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold">
                  {formatRupiah(summary.total_revenue)}
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                <DollarSign className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total Pesanan
                </p>
                <p className="text-2xl font-bold">{summary.total_orders}</p>
              </div>
              <div className="rounded-lg bg-chart-2/10 p-2.5 text-chart-2">
                <ShoppingBag className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Rata-rata Transaksi
                </p>
                <p className="text-2xl font-bold">
                  {formatRupiah(summary.average_order_value)}
                </p>
              </div>
              <div className="rounded-lg bg-chart-1/10 p-2.5 text-chart-1">
                <TrendingUp className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Selesai
                </p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {summary.completed_orders}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Pending
                </p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  {summary.pending_orders}
                </p>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
                <Clock className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Dibatalkan
                </p>
                <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                  {summary.cancelled_orders}
                </p>
              </div>
              <div className="rounded-lg bg-rose-500/10 p-2.5 text-rose-600 dark:text-rose-400">
                <XCircle className="size-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Sales Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Grafik Tren Penjualan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailySales.length > 0 ? (
              <ChartContainer config={salesChartConfig} className="h-72 w-full">
                <AreaChart
                  data={dailySales}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    className="stroke-border/50"
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs text-muted-foreground"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    className="text-xs text-muted-foreground"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="total_revenue"
                    stroke="var(--color-total_revenue)"
                    fill="var(--color-total_revenue)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <Empty className="py-12">
                <EmptyContent>
                  <EmptyDescription>
                    Tidak ada data tren penjualan untuk periode ini.
                  </EmptyDescription>
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>

        {/* Top Selling Products Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Grafik Produk Terlaris
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <ChartContainer
                config={topProductChartConfig}
                className="h-72 w-full"
              >
                <BarChart
                  layout="vertical"
                  data={topProducts}
                  margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    className="stroke-border/50"
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="product_name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={100}
                    className="text-xs text-muted-foreground"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="total_sold"
                    fill="var(--color-total_sold)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <Empty className="py-12">
                <EmptyContent>
                  <EmptyDescription>
                    Belum ada produk terjual untuk periode ini.
                  </EmptyDescription>
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Table Penjualan Harian */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Rincian Penjualan Harian
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailySales.length > 0 ? (
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Tanggal
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Pesanan
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySales.map((d: DailySales) => (
                      <tr
                        key={d.date}
                        className="border-b last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-3 py-2 font-medium">{d.date}</td>
                        <td className="px-3 py-2 text-right">
                          {d.total_orders}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatRupiah(d.total_revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty className="py-8">
                <EmptyContent>
                  <EmptyDescription>
                    Tidak ada data penjualan harian.
                  </EmptyDescription>
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>

        {/* Table Produk Terlaris */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Rincian Produk Terlaris
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Produk
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Terjual
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((t: TopProduct) => (
                      <tr
                        key={t.product_id}
                        className="border-b last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-3 py-2 font-medium">
                          {t.product_name}
                        </td>
                        <td className="px-3 py-2 text-right">{t.total_sold}</td>
                        <td className="px-3 py-2 text-right">
                          {formatRupiah(t.total_revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty className="py-8">
                <EmptyContent>
                  <EmptyDescription>Belum ada produk terjual.</EmptyDescription>
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
