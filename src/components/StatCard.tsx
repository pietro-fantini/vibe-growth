import { Card } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  progress?: number;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "success" | "warning";
  className?: string;
}

export function StatCard({
  title,
  value,
  progress,
  icon,
  trend,
  trendValue,
  variant = "default",
  className
}: StatCardProps) {
  const isMobile = useIsMobile();
  const getTrendColor = () => {
    switch (trend) {
      case "up": return "text-success";
      case "down": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "bg-gradient-success border-success/20 shadow-card";
      case "warning":
        return "bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20 shadow-card";
      default:
        return "bg-gradient-card border-border shadow-card";
    }
  };

  return (
    <Card className={cn(
      "p-6 transition-all duration-300 hover:shadow-primary border",
      getVariantStyles(),
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold">{value}</p>
            {trendValue && (
              <span className={cn("text-xs font-medium", getTrendColor())}>
                {trend === "up" ? "↗" : trend === "down" ? "↘" : "→"} {trendValue}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          {progress !== undefined && (
            !isMobile && (
              <ProgressRing progress={progress} size="sm">
                <span className="text-xs font-bold text-primary">
                  {Math.round(progress)}%
                </span>
              </ProgressRing>
            )
          )}
        </div>
      </div>
    </Card>
  );
}