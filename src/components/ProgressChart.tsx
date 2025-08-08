import { Card } from "@/components/ui/card";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, LabelList 
} from "recharts";
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

interface ChartData {
  name: string; // full label
  value: number;
  progress?: number;
}

interface ProgressChartProps {
  title: string;
  data: ChartData[];
  type?: "line" | "bar" | "pie";
  height?: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))', 
  'hsl(var(--warning))',
  'hsl(var(--progress))',
  'hsl(var(--accent))',
];

export function ProgressChart({ 
  title, 
  data, 
  type = "line", 
  height = 300 
}: ProgressChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    // Shorten labels for axes while keeping full name for tooltip
    shortName: d.name.length > 14 ? `${d.name.slice(0, 12)}…` : d.name,
  }));

  const config = {
    value: { label: "Value", color: "hsl(var(--primary))" },
    progress: { label: "Progress", color: "hsl(var(--success))" },
  } as const;

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <BarChart data={chartData} margin={{ top: 12, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="shortName" 
              fontSize={12}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              interval="preserveStartEnd"
              minTickGap={12}
              tickMargin={8}
              tickLine={false}
            />
            <YAxis 
              fontSize={12}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              domain={[0, 100]}
              tickCount={6}
              allowDecimals={false}
            />
            <Bar dataKey="value" fill="var(--color-value)" radius={[6, 6, 0, 0]}>
              <LabelList dataKey="value" position="top" formatter={(v: number) => `${v}%`} className="fill-foreground text-[10px]" />
            </Bar>
            <ChartTooltip content={<ChartTooltipContent nameKey="value" />} />
          </BarChart>
        );
      
      case "pie":
        // Render percent labels inside slices to avoid overflow
        const renderPercentLabel = (props: any) => {
          const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
          const rad = (Math.PI / 180) * midAngle;
          const x = cx + radius * Math.cos(-rad);
          const y = cy + radius * Math.sin(-rad);
          const value = Math.round((percent || 0) * 100);
          if (value === 0) return null;
          return (
            <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 12, fontWeight: 600 }}>
              {value}%
            </text>
          );
        };
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              dataKey="value"
              label={renderPercentLabel}
              labelLine={false}
              isAnimationActive={false}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </PieChart>
        );
      
      default:
        return (
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="shortName" 
              fontSize={12}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              interval="preserveStartEnd"
              minTickGap={12}
              tickMargin={8}
              tickLine={false}
            />
            <YAxis 
              fontSize={12}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              domain={[0, 100]}
              tickCount={6}
              allowDecimals={false}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="var(--color-value)" 
              strokeWidth={3}
              dot={{ fill: 'var(--color-value)', strokeWidth: 2, r: 4 }}
            />
            {chartData[0]?.progress !== undefined && (
              <Line 
                type="monotone" 
                dataKey="progress" 
                stroke="var(--color-progress)" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: 'var(--color-progress)', strokeWidth: 2, r: 3 }}
              />
            )}
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        );
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ChartContainer config={config} style={{ height }}>
        {renderChart()}
      </ChartContainer>
    </Card>
  );
}