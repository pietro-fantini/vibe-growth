import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trash2, Edit2, Plus, Check, X, LogOut, Target, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Goal {
  id: string;
  title: string;
  type: 'one_time' | 'recurring';
  target_count: number;
  user_id: string;
  is_active: boolean;
  current_progress?: number;
  completion_percentage?: number;
}

const Index = () => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalText, setNewGoalText] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("1");

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      // Fetch current progress for each goal
      const { data: progressData, error: progressError } = await supabase
        .from('current_goal_progress')
        .select('*')
        .eq('user_id', user?.id);

      if (progressError) throw progressError;

      // Merge goals with their progress
      const goalsWithProgress = goalsData.map(goal => {
        const progress = progressData.find(p => p.id === goal.id);
        return {
          ...goal,
          current_progress: progress?.current_progress || 0,
          completion_percentage: progress?.completion_percentage || 0
        };
      });

      setGoals(goalsWithProgress);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast({
        title: "Error loading goals",
        description: "Failed to load your goals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoalProgress = async (goalId: string) => {
    try {
      const { error } = await supabase.rpc('increment_goal_progress', {
        goal_uuid: goalId,
        increment_by: 1
      });

      if (error) throw error;

      // Refresh goals to get updated progress
      await fetchGoals();
      
      toast({
        description: "✅ Great job! Progress updated!",
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: "Error updating progress",
        description: "Failed to update goal progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addGoal = async () => {
    if (!newGoalText.trim() || !user) return;
    
    try {
      const { error } = await supabase
        .from('goals')
        .insert({
          title: newGoalText.trim(),
          type: 'one_time',
          target_count: parseInt(newGoalTarget) || 1,
          user_id: user.id
        });

      if (error) throw error;

      await fetchGoals();
      setNewGoalText("");
      setNewGoalTarget("1");
      
      toast({
        description: `✨ New goal "${newGoalText.trim()}" added!`,
      });
    } catch (error) {
      console.error('Error adding goal:', error);
      toast({
        title: "Error adding goal",
        description: "Failed to add goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ is_active: false })
        .eq('id', goalId)
        .eq('user_id', user?.id);

      if (error) throw error;

      await fetchGoals();
      
      toast({
        description: "🗑️ Goal deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: "Error deleting goal",
        description: "Failed to delete goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateGoalTitle = async (goalId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    
    try {
      const { error } = await supabase
        .from('goals')
        .update({ title: newTitle.trim() })
        .eq('id', goalId)
        .eq('user_id', user?.id);

      if (error) throw error;

      await fetchGoals();
      setEditingGoal(null);
      setNewGoalTitle("");
    } catch (error) {
      console.error('Error updating goal:', error);
      toast({
        title: "Error updating goal",
        description: "Failed to update goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        description: "👋 Signed out successfully",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="text-center space-y-2 flex-1">
            <div className="flex justify-center items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center shadow-primary">
                <Target className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Goal Tracker
              </h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Welcome back, {user?.email}! Track your progress and achieve your goals.
            </p>
          </div>
          <Button 
            onClick={handleSignOut}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Add New Goal */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Goal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="What's your goal?"
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addGoal();
                }}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Target"
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(e.target.value)}
                className="w-20"
                min="1"
              />
              <Button 
                onClick={addGoal} 
                disabled={!newGoalText.trim()}
                className="bg-gradient-primary hover:shadow-primary transition-smooth"
              >
                Add Goal
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Goals Grid */}
        {goals.length === 0 ? (
          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="text-center py-12">
              <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No goals yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first goal above. Every journey begins with a single step!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => (
              <Card key={goal.id} className="bg-gradient-card shadow-card border-0 hover:shadow-primary transition-smooth">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {editingGoal === goal.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={newGoalTitle}
                            onChange={(e) => setNewGoalTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') updateGoalTitle(goal.id, newGoalTitle);
                              if (e.key === 'Escape') {
                                setEditingGoal(null);
                                setNewGoalTitle("");
                              }
                            }}
                            className="h-8"
                            autoFocus
                          />
                          <Button size="sm" onClick={() => updateGoalTitle(goal.id, newGoalTitle)}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setEditingGoal(null);
                              setNewGoalTitle("");
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{goal.title}</CardTitle>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingGoal(goal.id);
                              setNewGoalTitle(goal.title);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteGoal(goal.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Progress</span>
                      <Badge variant="secondary">
                        {goal.current_progress || 0} / {goal.target_count}
                      </Badge>
                    </div>
                    <Progress 
                      value={goal.completion_percentage || 0} 
                      className="h-3"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-primary">
                        {Math.round(goal.completion_percentage || 0)}%
                      </span>
                      <Button
                        onClick={() => handleGoalProgress(goal.id)}
                        disabled={(goal.current_progress || 0) >= goal.target_count}
                        className="bg-gradient-success hover:shadow-primary transition-smooth"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Progress
                      </Button>
                    </div>
                    {(goal.current_progress || 0) >= goal.target_count && (
                      <Badge className="w-full justify-center bg-gradient-success text-success-foreground">
                        🎉 Goal Completed!
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;