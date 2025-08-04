import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  progress: number;
  target: number;
  current: number;
  deadline: string;
  status: "active" | "completed" | "paused";
  priority: "low" | "medium" | "high";
}

interface GoalCardProps {
  goal: Goal;
  onProgress: (goalId: string) => void;
  onComplete: (goalId: string) => void;
}

const categoryColors: Record<string, string> = {
  "AI Tools": "bg-primary/10 text-primary border-primary/20",
  "Side Projects": "bg-progress/10 text-progress border-progress/20", 
  "Fitness": "bg-success/10 text-success border-success/20",
  "Content": "bg-warning/10 text-warning border-warning/20",
};

const priorityColors: Record<string, string> = {
  high: "border-l-destructive",
  medium: "border-l-warning", 
  low: "border-l-success",
};

export function GoalCard({ goal, onProgress, onComplete }: GoalCardProps) {
  const progressPercentage = (goal.current / goal.target) * 100;
  const isCompleted = goal.status === "completed";
  const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Card className={cn(
      "p-6 transition-all duration-300 hover:shadow-primary border-l-4",
      priorityColors[goal.priority],
      isCompleted && "bg-success/5 border-success/20"
    )}>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{goal.title}</h3>
              {isCompleted && <CheckCircle2 className="h-5 w-5 text-success" />}
            </div>
            <p className="text-sm text-muted-foreground">{goal.description}</p>
          </div>
          <Badge 
            variant="secondary" 
            className={categoryColors[goal.category] || "bg-muted"}
          >
            {goal.category}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {goal.current} / {goal.target}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{daysLeft > 0 ? `${daysLeft} days left` : "Overdue"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              <span>{Math.round(progressPercentage)}% complete</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            {!isCompleted && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onProgress(goal.id)}
                >
                  +1 Progress
                </Button>
                {progressPercentage >= 100 && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onComplete(goal.id)}
                    className="bg-gradient-primary"
                  >
                    Complete
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}