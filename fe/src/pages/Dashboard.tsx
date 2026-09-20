import { useEffect } from "react";
import { get } from "../api/client";
import { subscribeOrderEvents } from "../api/sse";
import type { SalesSummary } from "../api/types";
import { Button } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function Dashboard() {
  const { data, err, reload } = useAsync(
    () => get<SalesSummary>("/admin/reports/sales?period=daily"),
    [],
  );
  const s = data?.data;

  usePageTitle(
    "Dashboard",
    <Button variant="outline" onClick={reload}>
      Segarkan
    </Button>,
  );

  useEffect(() => {
    return subscribeOrderEvents(reload);
  }, [reload]);

  const cards = s
    ? [
        {
          label: "Pesanan Hari Ini",
          value: s.total_orders,
          icon: "TrendingUp",
        },
        { label: "Selesai", value: s.completed_orders },
        { label: "Pending", value: s.pending_orders },
        {
          label: "Pendapatan Hari Ini",
          value: s.total_revenue.toLocaleString("id-ID"),
          money: true,
          icon: "TrendingUp",
        },
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
              <CardAction>
                <Badge variant="outline">
                  {c.icon === "TrendingUp" ? (
                    <TrendingUp className="size-4" />
                  ) : c.icon === "TrendingDown" ? (
                    <TrendingDown className="size-4" />
                  ) : null}
                  +12.5%
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Trending up this month <TrendingUp className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Visitors for the last 6 months
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
