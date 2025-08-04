import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

interface ChartData {
  name: string;
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
  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              fontSize={12}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              fontSize={12}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Bar 
              dataKey="value" 
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );
      
      case "pie":
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      
      default:
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              fontSize={12}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              fontSize={12}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
            />
            {data[0]?.progress !== undefined && (
              <Line 
                type="monotone" 
                dataKey="progress" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: 'hsl(var(--success))', strokeWidth: 2, r: 3 }}
              />
            )}
          </LineChart>
        );
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </Card>
  );
}