import { useEffect } from "react";
import { get } from "../api/client";
import { subscribeOrderEvents } from "../api/sse";
import type { SalesSummary } from "../api/types";
import { useAsync } from "../hooks/useAsync";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatRupiah } from "../lib/utils";

export default function Dashboard() {
  const { data, err, reload } = useAsync(
    () => get<SalesSummary>("/admin/reports/sales/daily"),
    [],
  );
  const s = data?.data;

  usePageTitle("Dashboard");

  useEffect(() => {
    return subscribeOrderEvents(reload);
  }, [reload]);

  const cards = s
    ? [
        { label: "Pesanan Hari Ini", value: s.total_orders },
        { label: "Selesai", value: s.completed_orders },
        { label: "Pending", value: s.pending_orders },
        { label: "Pendapatan Hari Ini", value: formatRupiah(s.total_revenue ?? 0) },
      ]
    : [];

  return (
    <>
      {err && <p className="text-sm font-medium text-destructive">{err}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="@container/card">
            <CardHeader>
              <CardDescription>{c.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {c.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </>
  );
}
