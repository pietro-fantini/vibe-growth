import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, subWeeks, addDays, isSameDay, startOfDay } from "date-fns";

interface HeatmapCell {
  date: Date;
  count: number;
}

interface SubgoalActivityHeatmapProps {
  weeks?: number; // default 52 weeks
  height?: number; // optional fixed height
}

const intensityClass = (count: number) => {
  if (count <= 0) return "bg-muted";
  if (count === 1) return "bg-primary/20";
  if (count === 2) return "bg-primary/40";
  if (count === 3) return "bg-primary/60";
  if (count === 4) return "bg-primary/80";
  return "bg-primary";
};

const SubgoalActivityHeatmap = ({ weeks = 13, height = 260 }: SubgoalActivityHeatmapProps) => {
  const [data, setData] = useState<{ occurred_at: string; delta: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const start = startOfWeek(subWeeks(new Date(), weeks - 1), { weekStartsOn: 0 });
      const { data, error } = await supabase
        .from("progress_change_events" as any)
        .select("occurred_at, delta, entity_type")
        .gte("occurred_at", start.toISOString())
        .eq("entity_type", "subgoal");
      if (!error && data) {
        setData(data.map((d: any) => ({ occurred_at: d.occurred_at, delta: d.delta })));
      }
      setLoading(false);
    };
    void load();
  }, [weeks]);

  const grid = useMemo<HeatmapCell[][]>(() => {
    const start = startOfWeek(subWeeks(new Date(), weeks - 1), { weekStartsOn: 0 });
    // Build weeks x 7 grid
    const weeksArr: HeatmapCell[][] = [];
    for (let w = 0; w < weeks; w++) {
      const column: HeatmapCell[] = [];
      for (let d = 0; d < 7; d++) {
        column.push({ date: addDays(start, w * 7 + d), count: 0 });
      }
      weeksArr.push(column);
    }

    const counts = data
      .filter((e) => e.delta > 0)
      .reduce<Record<string, number>>((acc, e) => {
        const day = format(new Date(e.occurred_at), "yyyy-MM-dd");
        acc[day] = (acc[day] || 0) + e.delta;
        return acc;
      }, {});

    weeksArr.forEach((col) => {
      col.forEach((cell) => {
        const key = format(cell.date, "yyyy-MM-dd");
        cell.count = counts[key] || 0;
      });
    });
    return weeksArr;
  }, [data, weeks]);

  // Month labels (approximate: label first of month)
  const monthLabels = useMemo(() => {
    const labels: { index: number; label: string }[] = [];
    grid.forEach((col, i) => {
      const firstDay = col[0].date;
      if (firstDay.getDate() <= 7) {
        labels.push({ index: i, label: format(firstDay, "MMM") });
      }
    });
    return labels;
  }, [grid]);

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto" style={{ height }}>
          <div className="inline-flex flex-col gap-2" style={{ minWidth: `${weeks * 14 + 60}px` }}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="h-3 w-3 rounded-sm bg-muted" />
              <div className="h-3 w-3 rounded-sm bg-primary/20" />
              <div className="h-3 w-3 rounded-sm bg-primary/40" />
              <div className="h-3 w-3 rounded-sm bg-primary/60" />
              <div className="h-3 w-3 rounded-sm bg-primary/80" />
              <div className="h-3 w-3 rounded-sm bg-primary" />
              <span>More</span>
            </div>
            <div className="flex gap-1">
              {/* Month labels */}
              <div className="w-8" />
              <div className="relative" style={{ width: `${weeks * 14}px` }}>
                {monthLabels.map(({ index, label }) => (
                  <span key={index} className="absolute text-[10px] text-muted-foreground" style={{ left: `${index * 14}px` }}>{label}</span>
                ))}
              </div>
            </div>
            <div className="flex">
              {/* Weekday labels */}
              <div className="flex flex-col justify-between mr-2 text-[10px] text-muted-foreground" style={{ height: 7 * 14 }}>
                <span>Sun</span>
                <span>Tue</span>
                <span>Thu</span>
                <span>Sat</span>
              </div>
              {/* Grid */}
              <div className="flex gap-1" style={{ height: 7 * 14 }}>
                {grid.map((col, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    {col.map((cell, j) => (
                      <div
                        key={j}
                        className={`h-3.5 w-3.5 rounded-sm ${intensityClass(cell.count)}`}
                        title={`${format(cell.date, "yyyy-MM-dd")} • ${cell.count} +1`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {loading && <p className="text-sm text-muted-foreground mt-2">Loading...</p>}
      </CardContent>
    </Card>
  );
};

export default SubgoalActivityHeatmap;


