import { useEffect, useMemo, useRef, useState } from "react";
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

const MonthlyTotalsChart = ({ months = 9, height = 300 }: MonthlyTotalsChartProps) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
    // keep only last N months; generate a continuous series ending at current month even if DB empty
    const maxMonths = isMobile ? Math.min(months, 6) : months;
    const parsed = rows.map((r) => ({
      monthKey: format(new Date(r.month_start), "yyyy-MM-01"),
      value: r.total_completed ?? 0,
    }));

    const end = new Date();
    end.setDate(1);
    const items: { name: string; value: number }[] = [];
    const start = new Date(end);
    start.setMonth(start.getMonth() - (maxMonths - 1));
    const cursor = new Date(start);

    while (cursor <= end) {
      const key = format(cursor, "yyyy-MM-01");
      const found = parsed.find((p) => p.monthKey === key)?.value ?? 0;
      items.push({ name: format(cursor, "MMM yyyy"), value: found });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return items;
  }, [rows, months, isMobile]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [data]);

  const gradientId = useMemo(() => `subgoal-line-gradient-${Math.random().toString(36).slice(2)}`, []);
  const gradientStops = useMemo(() => {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data.map((d) => d.value));
    const toColor = (v: number) => {
      const t = max === 0 ? 0 : v / max; // 0 => purple, 1 => green
      const p = { r: 124, g: 58, b: 237 };
      const g = { r: 34, g: 197, b: 94 };
      const r = Math.round(p.r + (g.r - p.r) * t);
      const gg = Math.round(p.g + (g.g - p.g) * t);
      const b = Math.round(p.b + (g.b - p.b) * t);
      return `rgb(${r}, ${gg}, ${b})`;
    };
    const n = data.length;
    return data.map((d, i) => (
      <stop key={i} offset={`${(i / Math.max(1, n - 1)) * 100}%`} stopColor={toColor(d.value)} />
    ));
  }, [data]);

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle>Subgoals Completion</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={scrollRef} className="w-full overflow-x-auto" style={{ height }}>
          <div style={{ minWidth: `${Math.max(700, (data.length || 1) * (isMobile ? 80 : 110))}px`, height: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    {gradientStops}
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" interval="preserveStartEnd" tick={{ fontSize: isMobile ? 10 : 12 }} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 28 : 40} />
                <Tooltip formatter={(v: any) => [v, "Completions"]} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={data.some((d) => d.value > 0) ? `url(#${gradientId})` : 'hsl(var(--primary))'}
                  strokeWidth={2.5}
                  dot={{ r: isMobile ? 2 : 3, fill: data.some((d) => d.value > 0) ? `url(#${gradientId})` : 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {loading && <p className="text-sm text-muted-foreground mt-2">Loading...</p>}
      </CardContent>
    </Card>
  );
};

export default MonthlyTotalsChart;
