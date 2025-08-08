import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface GoalCompletionItem {
  name: string;
  percentage: number; // 0 - 100
  color?: string; // optional tailwind color or CSS color
  goalType?: 'one_time' | 'recurring';
}

interface GoalCompletionChartProps {
  title: string;
  items: GoalCompletionItem[];
  className?: string;
}

export function GoalCompletionChart({ title, items, className }: GoalCompletionChartProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const sorted = [...items].sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0));

  return (
    <Card className={cn("p-6", className)}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-4">
        {sorted.map((item) => (
          <div key={item.name} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color || "hsl(var(--primary))" }}
                />
                <button
                  type="button"
                  onClick={() => setExpanded((e) => ({ ...e, [item.name]: !e[item.name] }))}
                  title="Tap to expand/collapse"
                  className={cn(
                    "text-left text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 rounded px-0.5",
                    expanded[item.name]
                      ? "whitespace-normal line-clamp-none"
                      : "truncate sm:whitespace-normal sm:line-clamp-2"
                  )}
                  aria-label={`Goal: ${item.name}`}
                >
                  {item.name}
                </button>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground shrink-0">{Math.round(item.percentage)}%</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.max(0, Math.min(100, item.percentage))}%`,
                  background: item.color || "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--success)) 100%)",
                }}
              />
              {/* subtle shine */}
              <div className="pointer-events-none absolute inset-0 rounded-full opacity-20" style={{
                background:
                  "radial-gradient(120px 60px at 10% -20%, rgba(255,255,255,0.6), transparent 60%), radial-gradient(120px 60px at 60% -30%, rgba(255,255,255,0.5), transparent 60%)",
              }} />
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">No goals to display yet.</p>
        )}
      </div>
    </Card>
  );
}

export default GoalCompletionChart;


