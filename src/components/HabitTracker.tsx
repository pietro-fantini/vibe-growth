import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Flame, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Habit {
  id: string;
  name: string;
  category: string;
  streak: number;
  completedToday: boolean;
  completedDates: string[];
  target: number; // target days per week
}

interface HabitTrackerProps {
  habit: Habit;
  onToggle: (habitId: string) => void;
}

const categoryColors: Record<string, string> = {
  "AI Tools": "bg-primary/10 text-primary",
  "Side Projects": "bg-progress/10 text-progress", 
  "Fitness": "bg-success/10 text-success",
  "Content": "bg-warning/10 text-warning",
};

export function HabitTracker({ habit, onToggle }: HabitTrackerProps) {
  const getStreakColor = () => {
    if (habit.streak >= 7) return "text-success";
    if (habit.streak >= 3) return "text-warning";
    return "text-muted-foreground";
  };

  const getLastWeekDates = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const lastWeekDates = getLastWeekDates();
  const completedThisWeek = lastWeekDates.filter(date => 
    habit.completedDates.includes(date)
  ).length;

  return (
    <Card className="p-4 transition-all duration-300 hover:shadow-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{habit.name}</h3>
            <Badge 
              variant="secondary" 
              className={cn("mt-1", categoryColors[habit.category])}
            >
              {habit.category}
            </Badge>
          </div>
          <Button
            size="sm"
            variant={habit.completedToday ? "default" : "outline"}
            onClick={() => onToggle(habit.id)}
            className={cn(
              "transition-all duration-300",
              habit.completedToday && "bg-gradient-success"
            )}
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Flame className={cn("h-4 w-4", getStreakColor())} />
            <span className={getStreakColor()}>
              {habit.streak} day streak
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{completedThisWeek}/{habit.target} this week</span>
          </div>
        </div>

        <div className="flex gap-1">
          {lastWeekDates.map((date, index) => {
            const isCompleted = habit.completedDates.includes(date);
            const isToday = date === new Date().toISOString().split('T')[0];
            
            return (
              <div
                key={date}
                className={cn(
                  "flex-1 h-2 rounded-sm transition-all duration-300",
                  isCompleted ? "bg-success" : "bg-muted",
                  isToday && "ring-2 ring-primary ring-opacity-50"
                )}
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
}