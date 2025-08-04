import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Brain, Code, Dumbbell, Camera, Plus, Minus, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubGoal {
  id: string;
  title: string;
  completed: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  subGoals: SubGoal[];
}

const Index = () => {
  const { toast } = useToast();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingSubGoal, setEditingSubGoal] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubGoalTitle, setNewSubGoalTitle] = useState("");

  const [categories, setCategories] = useState<Category[]>([
    {
      id: "ai-tools",
      name: "AI Tools",
      icon: <Brain className="h-6 w-6" />,
      color: "bg-primary/10 text-primary border-primary/20",
      subGoals: [
        { id: "1", title: "Try ChatGPT for coding", completed: true },
        { id: "2", title: "Test Midjourney", completed: true },
        { id: "3", title: "Explore Claude", completed: false },
        { id: "4", title: "Try GitHub Copilot", completed: false },
        { id: "5", title: "Test Notion AI", completed: false },
      ]
    },
    {
      id: "side-projects",
      name: "Side Projects",
      icon: <Code className="h-6 w-6" />,
      color: "bg-progress/10 text-progress border-progress/20",
      subGoals: [
        { id: "6", title: "Portfolio website", completed: true },
        { id: "7", title: "Weather app", completed: false },
        { id: "8", title: "Task manager", completed: false },
      ]
    },
    {
      id: "fitness",
      name: "Fitness",
      icon: <Dumbbell className="h-6 w-6" />,
      color: "bg-success/10 text-success border-success/20",
      subGoals: [
        { id: "9", title: "Monday workout", completed: true },
        { id: "10", title: "Wednesday workout", completed: true },
        { id: "11", title: "Friday workout", completed: true },
        { id: "12", title: "Sunday workout", completed: false },
      ]
    },
    {
      id: "content",
      name: "Content Creation",
      icon: <Camera className="h-6 w-6" />,
      color: "bg-warning/10 text-warning border-warning/20",
      subGoals: [
        { id: "13", title: "Blog post about AI", completed: true },
        { id: "14", title: "YouTube video", completed: false },
        { id: "15", title: "Twitter thread", completed: false },
        { id: "16", title: "LinkedIn article", completed: false },
      ]
    },
  ]);

  const getCompletionPercentage = (subGoals: SubGoal[]) => {
    if (subGoals.length === 0) return 0;
    const completed = subGoals.filter(goal => goal.completed).length;
    return Math.round((completed / subGoals.length) * 100);
  };

  const handleSubGoalToggle = (categoryId: string, subGoalId: string, increment: boolean) => {
    setCategories(prev => prev.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          subGoals: category.subGoals.map(subGoal => {
            if (subGoal.id === subGoalId) {
              return { ...subGoal, completed: increment };
            }
            return subGoal;
          })
        };
      }
      return category;
    }));

    toast({
      title: increment ? "Progress added!" : "Progress removed",
      description: increment ? "Great job on completing this goal!" : "Goal marked as incomplete",
    });
  };

  const addSubGoal = (categoryId: string) => {
    if (!newSubGoalTitle.trim()) return;

    const newSubGoal: SubGoal = {
      id: Date.now().toString(),
      title: newSubGoalTitle,
      completed: false
    };

    setCategories(prev => prev.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          subGoals: [...category.subGoals, newSubGoal]
        };
      }
      return category;
    }));

    setNewSubGoalTitle("");
    toast({
      title: "Sub-goal added!",
      description: "New sub-goal has been created",
    });
  };

  const deleteSubGoal = (categoryId: string, subGoalId: string) => {
    setCategories(prev => prev.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          subGoals: category.subGoals.filter(subGoal => subGoal.id !== subGoalId)
        };
      }
      return category;
    }));

    toast({
      title: "Sub-goal deleted",
      description: "Sub-goal has been removed",
    });
  };

  const updateCategoryName = (categoryId: string) => {
    if (!newCategoryName.trim()) return;

    setCategories(prev => prev.map(category => {
      if (category.id === categoryId) {
        return { ...category, name: newCategoryName };
      }
      return category;
    }));

    setEditingCategory(null);
    setNewCategoryName("");
    toast({
      title: "Category updated!",
      description: "Category name has been changed",
    });
  };

  const updateSubGoalTitle = (categoryId: string, subGoalId: string) => {
    if (!newSubGoalTitle.trim()) return;

    setCategories(prev => prev.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          subGoals: category.subGoals.map(subGoal => {
            if (subGoal.id === subGoalId) {
              return { ...subGoal, title: newSubGoalTitle };
            }
            return subGoal;
          })
        };
      }
      return category;
    }));

    setEditingSubGoal(null);
    setNewSubGoalTitle("");
    toast({
      title: "Sub-goal updated!",
      description: "Sub-goal title has been changed",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Goal Tracker
          </h1>
          <p className="text-lg text-muted-foreground">
            Track your progress across different areas of your life
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category) => {
            const completionPercentage = getCompletionPercentage(category.subGoals);
            const completedCount = category.subGoals.filter(goal => goal.completed).length;

            return (
              <Dialog key={category.id}>
                <DialogTrigger asChild>
                  <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-lg ${category.color}`}>
                            {category.icon}
                          </div>
                          <div>
                            {editingCategory === category.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={newCategoryName}
                                  onChange={(e) => setNewCategoryName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') updateCategoryName(category.id);
                                    if (e.key === 'Escape') {
                                      setEditingCategory(null);
                                      setNewCategoryName("");
                                    }
                                  }}
                                  className="h-8 w-32"
                                  autoFocus
                                />
                                <Button size="sm" onClick={() => updateCategoryName(category.id)}>
                                  Save
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-xl">{category.name}</CardTitle>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCategory(category.id);
                                    setNewCategoryName(category.name);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{completionPercentage}%</div>
                          <div className="text-sm text-muted-foreground">
                            {completedCount}/{category.subGoals.length} completed
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Progress value={completionPercentage} className="h-3" />
                    </CardContent>
                  </Card>
                </DialogTrigger>

                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${category.color}`}>
                        {category.icon}
                      </div>
                      {category.name} Goals
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {category.subGoals.map((subGoal) => (
                      <div key={subGoal.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          {editingSubGoal === subGoal.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={newSubGoalTitle}
                                onChange={(e) => setNewSubGoalTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') updateSubGoalTitle(category.id, subGoal.id);
                                  if (e.key === 'Escape') {
                                    setEditingSubGoal(null);
                                    setNewSubGoalTitle("");
                                  }
                                }}
                                className="h-8"
                                autoFocus
                              />
                              <Button size="sm" onClick={() => updateSubGoalTitle(category.id, subGoal.id)}>
                                Save
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${subGoal.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {subGoal.title}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingSubGoal(subGoal.id);
                                  setNewSubGoalTitle(subGoal.title);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            size="sm"
                            variant={subGoal.completed ? "default" : "outline"}
                            onClick={() => handleSubGoalToggle(category.id, subGoal.id, !subGoal.completed)}
                          >
                            {subGoal.completed ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteSubGoal(category.id, subGoal.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Add new sub-goal */}
                    <div className="flex items-center gap-2 p-3 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                      <Input
                        placeholder="Add new sub-goal..."
                        value={newSubGoalTitle}
                        onChange={(e) => setNewSubGoalTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addSubGoal(category.id);
                        }}
                      />
                      <Button onClick={() => addSubGoal(category.id)} disabled={!newSubGoalTitle.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Index;