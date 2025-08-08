import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { format } from "date-fns";

interface Row {
  goal_id: string;
  title: string;
  month_start: string; // date string
  completed_count: number;
}

interface GoalMonthlyTrendChartProps {
  months?: number;
  topN?: number;
  height?: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, var(--secondary)))",
  "hsl(var(--chart-3, var(--muted-foreground)))",
  "hsl(var(--chart-4, var(--accent)))",
  "hsl(var(--chart-5, var(--destructive)))",
];

const GoalMonthlyTrendChart = ({ months = 6, topN = 5, height = 320 }: GoalMonthlyTrendChartProps) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("monthly_goal_progress_view" as any)
        .select("goal_id,title,month_start,completed_count")
        .order("month_start", { ascending: true });
      if (!error && data) setRows(data as unknown as Row[]);
      setLoading(false);
    };
    load();
  }, []);

  const { data, keys } = useMemo(() => {
    const parsed = rows.map((r) => ({
      goal_id: r.goal_id,
      title: r.title,
      month: new Date(r.month_start),
      value: r.completed_count ?? 0,
    }));

    // Determine top goals by sum in window
    const end = parsed.length > 0 ? parsed[parsed.length - 1].month : new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - (months - 1));

    const inWindow = parsed.filter((p) => p.month >= start && p.month <= end);
    const sums = new Map<string, number>();
    inWindow.forEach((p) => sums.set(p.goal_id, (sums.get(p.goal_id) || 0) + p.value));

    const topGoalIds = Array.from(sums.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([id]) => id);

    const goalKeyById = new Map<string, string>();
    // Create stable keys using goal titles (ensure uniqueness)
    let dupCount: Record<string, number> = {};
    topGoalIds.forEach((id) => {
      const title = parsed.find((p) => p.goal_id === id)?.title || id.slice(0, 6);
      const base = title.length > 18 ? title.slice(0, 18) + "…" : title;
      if (goalKeyById.has(id)) return;
      if (Object.prototype.hasOwnProperty.call(dupCount, base)) {
        dupCount[base] += 1;
        goalKeyById.set(id, `${base} (${dupCount[base]})`);
      } else {
        dupCount[base] = 1;
        goalKeyById.set(id, base);
      }
    });

    // Build continuous monthly buckets
    const timeline: Date[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      timeline.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const rowsOut = timeline.map((m) => {
      const name = format(m, "MMM yyyy");
      const obj: any = { name };
      topGoalIds.forEach((id) => {
        const v = parsed.find(
          (p) => p.goal_id === id && format(p.month, "yyyy-MM-01") === format(m, "yyyy-MM-01")
        )?.value;
        obj[goalKeyById.get(id)!] = v ?? 0;
      });
      return obj;
    });

    const keys = Array.from(goalKeyById.values());
    return { data: rowsOut, keys };
  }, [rows, months, topN]);

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle>Top Goals by Month</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {keys.map((k, i) => (
                <Bar key={k} dataKey={k} stackId="a" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        {loading && <p className="text-sm text-muted-foreground mt-2">Loading...</p>}
      </CardContent>
    </Card>
  );
};

export default GoalMonthlyTrendChart;
