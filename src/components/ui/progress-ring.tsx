import { cn } from "@/lib/utils";

interface ProgressRingProps {
  progress: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}

const sizes = {
  sm: { ring: 40, stroke: 4 },
  md: { ring: 60, stroke: 6 },
  lg: { ring: 80, stroke: 8 },
};

export function ProgressRing({ 
  progress, 
  size = "md", 
  className,
  children 
}: ProgressRingProps) {
  const { ring, stroke } = sizes[size];
  const normalizedRadius = ring * 0.5 - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        height={ring}
        width={ring}
        className="transform -rotate-90"
      >
        <circle
          stroke="hsl(var(--border))"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={ring * 0.5}
          cy={ring * 0.5}
        />
        <circle
          stroke="hsl(var(--primary))"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={strokeDasharray}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={ring * 0.5}
          cy={ring * 0.5}
          className="transition-all duration-500 ease-smooth"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}