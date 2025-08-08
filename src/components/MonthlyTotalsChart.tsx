import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";

interface MonthlyTotalsChartProps {
  months?: number; // how many months back to show
  height?: number;
}

interface Row {
  month_start: string; // date string
  total_completed: number;
}

const MonthlyTotalsChart = ({ months = 12, height = 300 }: MonthlyTotalsChartProps) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("monthly_user_totals_view" as any)
        .select("month_start,total_completed")
        .order("month_start", { ascending: true });
      if (!error && data) {
        setRows(data as unknown as Row[]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const data = useMemo(() => {
    // keep only last N months
    const maxMonths = isMobile ? Math.min(months, 6) : months;
    const parsed = rows
      .map((r) => ({
        month: new Date(r.month_start),
        value: r.total_completed ?? 0,
      }))
      .sort((a, b) => a.month.getTime() - b.month.getTime());

    const end = parsed.length > 0 ? parsed[parsed.length - 1].month : new Date();
    // build a continuous timeline of months
    const items: { name: string; value: number }[] = [];
    const start = new Date(end);
    start.setMonth(start.getMonth() - (maxMonths - 1));
    const cursor = new Date(start);

    while (cursor <= end) {
      const key = format(cursor, "yyyy-MM-01");
      const found = parsed.find((p) => format(p.month, "yyyy-MM-01") === key);
      items.push({ name: format(cursor, "MMM yyyy"), value: found?.value ?? 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return items;
  }, [rows, months, isMobile]);

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle>Subgoal Completions</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ left: isMobile ? 0 : 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" interval={isMobile ? 'preserveStartEnd' : 0} tick={{ fontSize: isMobile ? 10 : 12 }} minTickGap={isMobile ? 24 : 8} />
              <YAxis allowDecimals={false} tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 28 : 40} />
              <Tooltip formatter={(v: any) => [v, "Completions"]} />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: isMobile ? 2 : 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {loading && <p className="text-sm text-muted-foreground mt-2">Loading...</p>}
      </CardContent>
    </Card>
  );
};

export default MonthlyTotalsChart;
