import { useState } from "react";
import { StatCard } from "@/components/StatCard";
import { GoalCard, Goal } from "@/components/GoalCard";
import { HabitTracker, Habit } from "@/components/HabitTracker";
import { ProgressChart } from "@/components/ProgressChart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Flame, TrendingUp, Calendar, Plus, Brain, Code, Dumbbell, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();
  
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: "1",
      title: "Try 5 new AI tools this month",
      description: "Explore and test different AI tools to stay updated with the latest technology",
      category: "AI Tools", 
      progress: 60,
      target: 5,
      current: 3,
      deadline: "2024-01-31",
      status: "active",
      priority: "high"
    },
    {
      id: "2", 
      title: "Ship 2 side projects",
      description: "Complete and deploy two meaningful side projects to build portfolio",
      category: "Side Projects",
      progress: 50,
      target: 2,
      current: 1,
      deadline: "2024-03-15",
      status: "active", 
      priority: "high"
    },
    {
      id: "3",
      title: "Workout 4 times per week",
      description: "Maintain consistent fitness routine for better health and energy",
      category: "Fitness",
      progress: 75,
      target: 16,
      current: 12,
      deadline: "2024-01-31",
      status: "active",
      priority: "medium"
    },
    {
      id: "4",
      title: "Create 10 pieces of content",
      description: "Build personal brand through consistent content creation",
      category: "Content",
      progress: 30,
      target: 10,
      current: 3,
      deadline: "2024-02-28",
      status: "active",
      priority: "medium"
    }
  ]);

  const [habits, setHabits] = useState<Habit[]>([
    {
      id: "1",
      name: "Daily AI tool exploration",
      category: "AI Tools",
      streak: 5,
      completedToday: true,
      completedDates: ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"],
      target: 7
    },
    {
      id: "2", 
      name: "Code for side projects",
      category: "Side Projects",
      streak: 3,
      completedToday: false,
      completedDates: ["2024-01-01", "2024-01-03", "2024-01-04"],
      target: 5
    },
    {
      id: "3",
      name: "Workout session",
      category: "Fitness", 
      streak: 2,
      completedToday: true,
      completedDates: ["2024-01-04", "2024-01-05"],
      target: 4
    },
    {
      id: "4",
      name: "Create content",
      category: "Content",
      streak: 1,
      completedToday: false,
      completedDates: ["2024-01-05"],
      target: 3
    }
  ]);

  const handleGoalProgress = (goalId: string) => {
    setGoals(prev => prev.map(goal => 
      goal.id === goalId 
        ? { ...goal, current: goal.current + 1 }
        : goal
    ));
    toast({
      title: "Progress updated!",
      description: "Great job making progress on your goal.",
    });
  };

  const handleGoalComplete = (goalId: string) => {
    setGoals(prev => prev.map(goal =>
      goal.id === goalId
        ? { ...goal, status: "completed" as const }
        : goal
    ));
    toast({
      title: "Goal completed! 🎉",
      description: "Congratulations on achieving your goal!",
    });
  };

  const handleHabitToggle = (habitId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setHabits(prev => prev.map(habit => {
      if (habit.id === habitId) {
        const isCompleted = habit.completedDates.includes(today);
        const newCompletedDates = isCompleted
          ? habit.completedDates.filter(date => date !== today)
          : [...habit.completedDates, today];
        
        return {
          ...habit,
          completedToday: !isCompleted,
          completedDates: newCompletedDates,
          streak: !isCompleted ? habit.streak + 1 : Math.max(0, habit.streak - 1)
        };
      }
      return habit;
    }));
  };

  const weeklyProgressData = [
    { name: "Mon", value: 4, progress: 6 },
    { name: "Tue", value: 6, progress: 6 },
    { name: "Wed", value: 5, progress: 6 },
    { name: "Thu", value: 7, progress: 6 },
    { name: "Fri", value: 6, progress: 6 },
    { name: "Sat", value: 3, progress: 6 },
    { name: "Sun", value: 4, progress: 6 },
  ];

  const categoryData = [
    { name: "AI Tools", value: 25 },
    { name: "Side Projects", value: 35 },
    { name: "Fitness", value: 30 },
    { name: "Content", value: 10 },
  ];

  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.status === "completed").length;
  const activeStreak = Math.max(...habits.map(h => h.streak));
  const todayHabits = habits.filter(h => h.completedToday).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Your Growth Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">
            Track your habits, achieve your goals, and become the best version of yourself
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Goals Completed"
            value={`${completedGoals}/${totalGoals}`}
            progress={(completedGoals / totalGoals) * 100}
            icon={<Target className="h-5 w-5" />}
            trend="up"
            trendValue="+2 this week"
            variant="success"
          />
          <StatCard
            title="Current Streak"
            value={`${activeStreak} days`}
            icon={<Flame className="h-5 w-5" />}
            trend="up"
            trendValue="+1 today"
          />
          <StatCard
            title="Today's Habits"
            value={`${todayHabits}/${habits.length}`}
            progress={(todayHabits / habits.length) * 100}
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatCard
            title="Weekly Progress"
            value="85%"
            icon={<TrendingUp className="h-5 w-5" />}
            trend="up"
            trendValue="+12%"
            variant="success"
          />
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="habits">Habits</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProgressChart
                title="Weekly Activity"
                data={weeklyProgressData}
                type="line"
              />
              <ProgressChart
                title="Focus Areas"
                data={categoryData}
                type="pie"
                height={250}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Recent Goals</h3>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Goal
                  </Button>
                </div>
                <div className="space-y-3">
                  {goals.slice(0, 3).map(goal => (
                    <div key={goal.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{goal.title}</p>
                        <p className="text-sm text-muted-foreground">{goal.current}/{goal.target}</p>
                      </div>
                      <Badge variant="secondary">{goal.category}</Badge>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Today's Habits</h3>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Habit
                  </Button>
                </div>
                <div className="space-y-3">
                  {habits.map(habit => (
                    <div key={habit.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          habit.category === "AI Tools" ? "bg-primary/10 text-primary" :
                          habit.category === "Side Projects" ? "bg-progress/10 text-progress" :
                          habit.category === "Fitness" ? "bg-success/10 text-success" :
                          "bg-warning/10 text-warning"
                        }`}>
                          {habit.category === "AI Tools" ? <Brain className="h-4 w-4" /> :
                           habit.category === "Side Projects" ? <Code className="h-4 w-4" /> :
                           habit.category === "Fitness" ? <Dumbbell className="h-4 w-4" /> :
                           <Camera className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium">{habit.name}</p>
                          <p className="text-sm text-muted-foreground">{habit.streak} day streak</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={habit.completedToday ? "default" : "outline"}
                        onClick={() => handleHabitToggle(habit.id)}
                      >
                        {habit.completedToday ? "✓" : "○"}
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Your Goals</h2>
              <Button className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {goals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onProgress={handleGoalProgress}
                  onComplete={handleGoalComplete}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="habits" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Daily Habits</h2>
              <Button className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                New Habit
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {habits.map(habit => (
                <HabitTracker
                  key={habit.id}
                  habit={habit}
                  onToggle={handleHabitToggle}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-bold">Analytics & Insights</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProgressChart
                title="Monthly Progress Trend"
                data={[
                  { name: "Week 1", value: 65 },
                  { name: "Week 2", value: 72 },
                  { name: "Week 3", value: 68 },
                  { name: "Week 4", value: 85 },
                ]}
                type="bar"
              />
              <ProgressChart
                title="Category Performance"
                data={categoryData}
                type="bar"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
