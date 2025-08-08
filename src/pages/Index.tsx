import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trash2, Edit2, Plus, Check, X, LogOut, Target, Loader2, Minus, LayoutGrid, BarChart2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { ProgressChart } from "@/components/ProgressChart";
import GoalCompletionChart from "@/components/GoalCompletionChart";
import MonthlyTotalsChart from "@/components/MonthlyTotalsChart";
import GoalMonthlyTrendChart from "@/components/GoalMonthlyTrendChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Goal {
  id: string;
  title: string;
  type: 'one_time' | 'recurring';
  target_count: number;
  user_id: string;
  is_active: boolean;
  current_progress?: number;
  completion_percentage?: number;
  background_color?: string;
  subgoals?: Subgoal[];
}

interface Subgoal {
  id: string;
  goal_id: string;
  title: string;
  type: 'one_time' | 'recurring';
  target_count: number;
  user_id: string;
  is_active: boolean;
  current_progress?: number;
  completion_percentage?: number;
  progress?: number;
  target?: number;
}

const Index = () => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editingSubgoals, setEditingSubgoals] = useState<string | null>(null);
  const [editingGoalSettings, setEditingGoalSettings] = useState<string | null>(null);
  const [editingSubgoal, setEditingSubgoal] = useState<string | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalText, setNewGoalText] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("5");
  const [newGoalColor, setNewGoalColor] = useState("#FFB3BA"); // Default to first pastel color
  const [showAddGoalDialog, setShowAddGoalDialog] = useState(false);
  const [newSubgoalText, setNewSubgoalText] = useState("");
  const [newSubgoalType, setNewSubgoalType] = useState<'one_time' | 'recurring'>('one_time');
  const [newSubgoalTarget, setNewSubgoalTarget] = useState("1");
  const [editingSubgoalTitle, setEditingSubgoalTitle] = useState("");
  const [editingSubgoalTarget, setEditingSubgoalTarget] = useState<string | null>(null);
  const [editingSubgoalTargetValue, setEditingSubgoalTargetValue] = useState("");
  const [recentlyCompletedSubgoalId, setRecentlyCompletedSubgoalId] = useState<string | null>(null);
  const [recentlyCompletedGoalId, setRecentlyCompletedGoalId] = useState<string | null>(null);

  // Pastel color options
  const pastelColors = [
    "#FFB3BA", // Light pink
    "#BAFFC9", // Light green
    "#BAE1FF", // Light blue
    "#FFFFBA", // Light yellow
    "#FFDFBA"  // Light peach
  ];

  useEffect(() => {
    if (user) {
      // Avoid showing the full-page loader during background refreshes
      if (goals.length === 0) setLoading(true);
      fetchGoals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchGoals = async () => {
    try {
      // Run queries in parallel to reduce latency
      const [goalsRes, progressRes, subgoalsRes, subgoalProgressRes] = await Promise.all([
        supabase.from('goals')
          .select('*')
          .eq('user_id', user?.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase.from('current_goal_progress')
          .select('*')
          .eq('user_id', user?.id),
        supabase.from('subgoals')
          .select('*')
          .eq('user_id', user?.id)
          .eq('is_active', true),
        supabase.from('subgoal_progress').select('*'),
      ]);

      if (goalsRes.error) throw goalsRes.error;
      if (progressRes.error) throw progressRes.error;
      if (subgoalsRes.error) throw subgoalsRes.error;
      if (subgoalProgressRes.error) throw subgoalProgressRes.error;

      const goalsData = goalsRes.data || [];
      const progressData = progressRes.data || [];
      const subgoalsData = subgoalsRes.data || [];
      const subgoalProgressData = subgoalProgressRes.data || [];

      const goalsWithProgress = goalsData.map(goal => {
        const progress = progressData.find(p => p.id === goal.id);
        const goalSubgoals = subgoalsData.filter(s => s.goal_id === goal.id).map(subgoal => {
          const subgoalProgress = subgoalProgressData.find(sp => sp.subgoal_id === subgoal.id);
          return {
            ...subgoal,
            current_progress: subgoalProgress?.completed_count || 0,
            progress: subgoalProgress?.completed_count || 0,
            target: subgoal.target_count,
            completion_percentage: subgoal.target_count > 0 
              ? Math.min(((subgoalProgress?.completed_count || 0) / subgoal.target_count) * 100, 100)
              : 0
          };
        });
        return {
          ...goal,
          current_progress: progress?.current_progress || 0,
          completion_percentage: progress?.completion_percentage || 0,
          subgoals: goalSubgoals
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
    // Optimistic update
    let previousGoals: Goal[] | null = null;
    setGoals((current) => {
      previousGoals = current;
      return current.map((goal) => {
        if (goal.id !== goalId) return goal;
        const updatedCurrent = (goal.current_progress || 0) + 1;
        const completion = goal.target_count > 0
          ? Math.min((updatedCurrent / goal.target_count) * 100, 100)
          : 0;
        const crossed = (goal.current_progress || 0) < goal.target_count && updatedCurrent >= goal.target_count;
        if (crossed) {
          setRecentlyCompletedGoalId(goalId);
          setTimeout(() => setRecentlyCompletedGoalId((id) => (id === goalId ? null : id)), 1200);
        }
        return {
          ...goal,
          current_progress: updatedCurrent,
          completion_percentage: completion,
        };
      });
    });

    try {
      const { error } = await supabase.rpc('increment_goal_progress', {
        goal_uuid: goalId,
        increment_by: 1
      });

      if (error) throw error;

      // Sync in background to ensure consistency without blocking UI
      void fetchGoals();
      
      toast({
        description: "✅ Great job! Progress updated!",
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      if (previousGoals) setGoals(previousGoals);
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
          target_count: parseInt(newGoalTarget) || 5,
          background_color: newGoalColor,
          user_id: user.id
        });

      if (error) throw error;

      await fetchGoals();
      setNewGoalText("");
      setNewGoalTarget("5");
      setNewGoalColor("#FFB3BA");
      setShowAddGoalDialog(false);
      
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

  const updateGoalSettings = async (goalId: string, updates: { title?: string; target_count?: number; background_color?: string }) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', goalId)
        .eq('user_id', user?.id);

      if (error) throw error;

      await fetchGoals();
      setEditingGoalSettings(null);
      setNewGoalTitle("");
      setNewGoalTarget("");
      setNewGoalColor("#FFB3BA");
      
      toast({
        description: "✨ Goal updated successfully!",
      });
    } catch (error) {
      console.error('Error updating goal:', error);
      toast({
        title: "Error updating goal",
        description: "Failed to update goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateSubgoalTitle = async (subgoalId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    
    try {
      const { error } = await supabase
        .from('subgoals')
        .update({ title: newTitle.trim() })
        .eq('id', subgoalId)
        .eq('user_id', user?.id);

      if (error) throw error;

      await fetchGoals();
      setEditingSubgoal(null);
      setEditingSubgoalTitle("");
      
      toast({
        description: "✨ Subgoal updated successfully!",
      });
    } catch (error) {
      console.error('Error updating subgoal:', error);
      toast({
        title: "Error updating subgoal",
        description: "Failed to update subgoal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateSubgoalTarget = async (subgoalId: string, newTarget: string) => {
    const targetValue = parseInt(newTarget);
    if (!targetValue || targetValue < 1) return;
    
    try {
      // Get the subgoal and its parent goal id
      const { data: subgoalData, error: subgoalError } = await supabase
        .from('subgoals')
        .select('goal_id')
        .eq('id', subgoalId)
        .single();

      if (subgoalError) throw subgoalError;

      // Update the subgoal target
      const { error } = await supabase
        .from('subgoals')
        .update({ target_count: targetValue })
        .eq('id', subgoalId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Recalculate the parent goal progress to reflect the new completion status
      const { error: recalcError } = await supabase.rpc('recalculate_goal_progress', {
        goal_uuid: subgoalData.goal_id
      });

      if (recalcError) throw recalcError;

      await fetchGoals();
      setEditingSubgoalTarget(null);
      setEditingSubgoalTargetValue("");
      
      toast({
        description: "✨ Subgoal target updated successfully!",
      });
    } catch (error) {
      console.error('Error updating subgoal target:', error);
      toast({
        title: "Error updating subgoal target",
        description: "Failed to update subgoal target. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      console.log("Starting sign out process...");
      await signOut();
      console.log("Sign out completed successfully");
      toast({
        description: "👋 Signed out successfully",
      });
    } catch (error) {
      console.error("Error during sign out:", error);
      toast({
        title: "Error signing out",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addSubgoal = async (goalId: string) => {
    if (!newSubgoalText.trim() || !user) return;
    
    try {
      const targetCount = newSubgoalType === 'one_time' 
        ? parseInt(newSubgoalTarget) || 1 
        : parseInt(newSubgoalTarget) || 5;
        
      const { error } = await supabase
        .from('subgoals')
        .insert({
          goal_id: goalId,
          title: newSubgoalText.trim(),
          type: newSubgoalType,
          target_count: targetCount,
          user_id: user.id
        });

      if (error) throw error;

      await fetchGoals();
      setNewSubgoalText("");
      setNewSubgoalType('one_time');
      setNewSubgoalTarget("1");
      setEditingSubgoals(null);
      
      toast({
        description: `✨ Subgoal "${newSubgoalText.trim()}" added!`,
      });
    } catch (error) {
      console.error('Error adding subgoal:', error);
      toast({
        title: "Error adding subgoal",
        description: "Failed to add subgoal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteSubgoal = async (subgoalId: string) => {
    try {
      const { error } = await supabase.rpc('delete_subgoal_and_recalculate', {
        subgoal_uuid: subgoalId
      });

      if (error) throw error;

      await fetchGoals();
      
      toast({
        description: "🗑️ Subgoal deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting subgoal:', error);
      toast({
        title: "Error deleting subgoal",
        description: "Failed to delete subgoal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubgoalProgress = async (subgoalId: string, increment: boolean = true) => {
    // Optimistic update: update subgoal progress and possibly parent goal if crossing threshold
    let previousGoals: Goal[] | null = null;
    setGoals((current) => {
      previousGoals = current;
      return current.map((goal) => {
        if (!goal.subgoals) return goal;
        let parentDelta = 0;
        const updatedSubgoals = goal.subgoals.map((sg) => {
          if (sg.id !== subgoalId) return sg;
          const oldProgress = sg.current_progress || 0;
          const newProgress = increment ? oldProgress + 1 : Math.max(0, oldProgress - 1);
          const wasCompleted = oldProgress >= sg.target_count;
          const nowCompleted = newProgress >= sg.target_count;
          if (increment && !wasCompleted && nowCompleted) parentDelta = 1;
          if (!increment && wasCompleted && !nowCompleted) parentDelta = -1;
          if (increment && !wasCompleted && nowCompleted) {
            setRecentlyCompletedSubgoalId(subgoalId);
            setTimeout(() => setRecentlyCompletedSubgoalId((id) => (id === subgoalId ? null : id)), 1200);
          }
          return {
            ...sg,
            current_progress: newProgress,
            progress: newProgress,
            completion_percentage: sg.target_count > 0
              ? Math.min((newProgress / sg.target_count) * 100, 100)
              : 0,
          };
        });

        if (parentDelta !== 0) {
          const updatedParentProgress = (goal.current_progress || 0) + parentDelta;
          const updatedCompletion = goal.target_count > 0
            ? Math.min((updatedParentProgress / goal.target_count) * 100, 100)
            : 0;
          return {
            ...goal,
            subgoals: updatedSubgoals,
            current_progress: updatedParentProgress,
            completion_percentage: updatedCompletion,
          };
        }

        return { ...goal, subgoals: updatedSubgoals };
      });
    });

    try {
      const functionName = increment ? 'handle_subgoal_completion' : 'handle_subgoal_decrement';
      const { error } = await supabase.rpc(functionName, {
        subgoal_uuid: subgoalId,
        [increment ? 'increment_by' : 'decrement_by']: 1
      });

      if (error) throw error;

      // Sync in background to ensure correctness
      void fetchGoals();
      
      toast({
        description: increment ? "✅ Progress added!" : "↩️ Progress removed!",
      });
    } catch (error) {
      console.error('Error updating subgoal progress:', error);
      if (previousGoals) setGoals(previousGoals);
      toast({
        title: "Error updating progress",
        description: "Failed to update subgoal progress. Please try again.",
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
        <div className="relative flex items-center">
          <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center shadow-primary">
                <Target className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Hurry Up!
              </h1>
            </div>
          </div>
          <div className="ml-auto relative z-10">
            <Button 
              onClick={() => {
                console.log("Logout button clicked!");
                handleSignOut();
              }}
              variant="outline"
              size="sm"
              className="flex items-center hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Add New Goal */}
        <div className="flex justify-end">
          <Dialog open={showAddGoalDialog} onOpenChange={setShowAddGoalDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:shadow-primary transition-smooth">
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Goal Title</label>
                  <Input
                    placeholder="What's your goal? (add emoji at start if you want)"
                    value={newGoalText}
                    onChange={(e) => setNewGoalText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addGoal();
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Target</label>
                  <Input
                    type="number"
                    placeholder="Target"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Background Color</label>
                  <div className="flex gap-2">
                    {pastelColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          newGoalColor === color 
                            ? 'border-primary scale-110' 
                            : 'border-muted hover:border-primary/50'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewGoalColor(color)}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddGoalDialog(false);
                      setNewGoalText("");
                      setNewGoalTarget("5");
                      setNewGoalColor("#FFB3BA");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={addGoal} 
                    disabled={!newGoalText.trim()}
                    className="bg-gradient-primary hover:shadow-primary transition-smooth"
                  >
                    Add Goal
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="goals" className="w-full">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="goals" className="gap-2"><LayoutGrid className="h-4 w-4" /> Goals</TabsTrigger>
              <TabsTrigger value="dashboard" className="gap-2"><BarChart2 className="h-4 w-4" /> Dashboard</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="goals" className="mt-6">
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
              <Card 
                key={goal.id} 
                className="shadow-card border-0 hover:shadow-primary transition-smooth"
                style={{ 
                  backgroundColor: goal.background_color || 'hsl(var(--card))'
                }}
              >
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
                              setEditingGoalSettings(goal.id);
                              setNewGoalTitle(goal.title);
                              setNewGoalTarget(goal.target_count.toString());
                              setNewGoalColor(goal.background_color || "#FFB3BA");
                            }}
                            title="Edit goal settings"
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
                      title="Delete goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {editingGoalSettings === goal.id && (
                    <div className="space-y-4 mt-4 p-4 border border-border rounded-md bg-muted/10">
                      <div>
                        <label className="block text-sm font-medium mb-2">Goal Title</label>
                        <Input
                          type="text"
                          value={newGoalTitle}
                          onChange={(e) => setNewGoalTitle(e.target.value)}
                          className="w-full"
                          placeholder="Enter goal title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Target</label>
                        <Input
                          type="number"
                          value={newGoalTarget}
                          onChange={(e) => setNewGoalTarget(e.target.value)}
                          className="w-full"
                          placeholder="Enter target count"
                        />
                      </div>
                       <div>
                         <label className="block text-sm font-medium mb-2">Background Color</label>
                         <div className="flex gap-2">
                           {pastelColors.map((color) => (
                             <button
                               key={color}
                               type="button"
                               className={`w-8 h-8 rounded-full border-2 transition-all ${
                                 newGoalColor === color 
                                   ? 'border-primary scale-110' 
                                   : 'border-muted hover:border-primary/50'
                               }`}
                               style={{ backgroundColor: color }}
                               onClick={() => setNewGoalColor(color)}
                             />
                           ))}
                         </div>
                       </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateGoalSettings(goal.id, {
                            title: newGoalTitle,
                            target_count: parseInt(newGoalTarget) || goal.target_count,
                            background_color: newGoalColor
                          })}
                        >
                          Save Changes
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                           onClick={() => {
                             setEditingGoalSettings(null);
                             setNewGoalTitle("");
                             setNewGoalTarget("");
                             setNewGoalColor("#FFB3BA");
                           }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent className={recentlyCompletedGoalId === goal.id ? 'transition-transform scale-[1.01]' : ''}>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Progress 
                        value={goal.completion_percentage || 0} 
                        className="flex-1 h-3"
                      />
                      <Badge variant="secondary">
                        {goal.current_progress || 0} / {goal.target_count}
                      </Badge>
                    </div>
                    {(goal.current_progress || 0) >= goal.target_count && (
                      <Badge className="w-full justify-center bg-gradient-success text-success-foreground">
                        🎉 Goal Completed!
                      </Badge>
                    )}

                    {/* Subgoals Section */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold">Subgoals</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingSubgoals(editingSubgoals === goal.id ? null : goal.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Subgoal
                        </Button>
                      </div>

                      {editingSubgoals === goal.id && (
                        <div className="space-y-3 mb-4 p-3 bg-muted/30 rounded-lg">
                          <Input
                            placeholder="Subgoal title"
                            value={newSubgoalText}
                            onChange={(e) => setNewSubgoalText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') addSubgoal(goal.id);
                              if (e.key === 'Escape') {
                                setEditingSubgoals(null);
                                setNewSubgoalText("");
                              }
                            }}
                          />
                          <div className="flex gap-2">
                            <Select value={newSubgoalType} onValueChange={(value: 'one_time' | 'recurring') => {
                              setNewSubgoalType(value);
                              setNewSubgoalTarget(value === 'recurring' ? "5" : "1");
                            }}>
                              <SelectTrigger className="flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="one_time">One-time</SelectItem>
                                <SelectItem value="recurring">Recurring (monthly)</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              placeholder="Target"
                              value={newSubgoalTarget}
                              onChange={(e) => setNewSubgoalTarget(e.target.value)}
                              className="w-20"
                              min="1"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => addSubgoal(goal.id)} disabled={!newSubgoalText.trim()}>
                              Add Subgoal
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => {
                              setEditingSubgoals(null);
                              setNewSubgoalText("");
                               setNewSubgoalTarget(newSubgoalType === 'recurring' ? "5" : "1");
                            }}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {goal.subgoals && goal.subgoals.length > 0 ? (
                        <div className="space-y-2">
                           {goal.subgoals.map((subgoal) => (
                              <div
                                key={subgoal.id}
                                className={`p-2 bg-card rounded border transition-transform ${recentlyCompletedSubgoalId === subgoal.id ? 'ring-2 ring-success scale-[1.02]' : ''}`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    {editingSubgoal === subgoal.id ? (
                                      <div className="flex items-center gap-2">
                                        <Input
                                          value={editingSubgoalTitle}
                                          onChange={(e) => setEditingSubgoalTitle(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') updateSubgoalTitle(subgoal.id, editingSubgoalTitle);
                                            if (e.key === 'Escape') {
                                              setEditingSubgoal(null);
                                              setEditingSubgoalTitle("");
                                            }
                                          }}
                                          className="h-6 text-sm"
                                          autoFocus
                                        />
                                        <Button size="sm" onClick={() => updateSubgoalTitle(subgoal.id, editingSubgoalTitle)} className="h-6 w-6 p-0">
                                          <Check className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => {
                                            setEditingSubgoal(null);
                                            setEditingSubgoalTitle("");
                                          }}
                                          className="h-6 w-6 p-0"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm">{subgoal.title}</span>
                                        {(subgoal.current_progress || 0) >= subgoal.target_count && (
                                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        )}
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setEditingSubgoal(subgoal.id);
                                            setEditingSubgoalTitle(subgoal.title);
                                          }}
                                          className="h-6 w-6 p-0"
                                          title="Edit subgoal"
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  <Badge variant={subgoal.type === 'recurring' ? 'default' : 'secondary'} className="text-xs">
                                    {subgoal.type === 'recurring' ? 'Monthly' : 'One-time'}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteSubgoal(subgoal.id)}
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive ml-auto"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Progress 
                                    value={subgoal.target_count > 0 
                                      ? Math.min(((subgoal.current_progress || 0) / subgoal.target_count) * 100, 100)
                                      : 0
                                    } 
                                    className="flex-1 h-2"
                                  />
                                  {editingSubgoalTarget === subgoal.id ? (
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        value={editingSubgoalTargetValue}
                                        onChange={(e) => setEditingSubgoalTargetValue(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') updateSubgoalTarget(subgoal.id, editingSubgoalTargetValue);
                                          if (e.key === 'Escape') {
                                            setEditingSubgoalTarget(null);
                                            setEditingSubgoalTargetValue("");
                                          }
                                        }}
                                        className="h-6 w-12 text-xs"
                                        min="1"
                                        autoFocus
                                      />
                                      <span className="text-xs">/</span>
                                      <span className="text-xs">{subgoal.current_progress || 0}</span>
                                      <Button size="sm" onClick={() => updateSubgoalTarget(subgoal.id, editingSubgoalTargetValue)} className="h-6 w-6 p-0">
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => {
                                          setEditingSubgoalTarget(null);
                                          setEditingSubgoalTargetValue("");
                                        }}
                                        className="h-6 w-6 p-0"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs cursor-pointer hover:bg-muted"
                                      onClick={() => {
                                        setEditingSubgoalTarget(subgoal.id);
                                        setEditingSubgoalTargetValue(subgoal.target_count.toString());
                                      }}
                                    >
                                      {subgoal.current_progress || 0}/{subgoal.target_count}
                                    </Badge>
                                  )}
                                 <div className="flex items-center gap-1">
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     onClick={() => handleSubgoalProgress(subgoal.id, false)}
                                     disabled={(subgoal.current_progress || 0) <= 0}
                                     className="h-6 w-6 p-0"
                                   >
                                     <Minus className="h-3 w-3" />
                                   </Button>
                                   <Button
                                     size="sm"
                                     onClick={() => handleSubgoalProgress(subgoal.id, true)}
                                     className="h-6 w-6 p-0 bg-gradient-success"
                                   >
                                     <Plus className="h-3 w-3" />
                                   </Button>
                                 </div>
                               </div>
                             </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No subgoals yet</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </TabsContent>

          <TabsContent value="dashboard" className="mt-6 space-y-6">
            {/* Overview Stats */}
            {goals.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Goals" value={goals.length} variant="default" />
                <StatCard 
                  title="Completed Goals"
                  value={goals.filter(g => (g.current_progress || 0) >= g.target_count).length}
                  variant="success"
                />
                <StatCard 
                  title="Active Subgoals"
                  value={goals.reduce((acc, g) => acc + (g.subgoals?.length || 0), 0)}
                  variant="default"
                />
                <StatCard 
                  title="Avg. Completion"
                  value={`${Math.round(
                    goals.reduce((acc, g) => acc + (g.completion_percentage || 0), 0) / goals.length
                  )}%`}
                  progress={
                    goals.reduce((acc, g) => acc + (g.completion_percentage || 0), 0) / goals.length
                  }
                />
              </div>
            )}

            {/* Charts */}
            {goals.length > 0 && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <GoalCompletionChart
                      title="Goal Completion (%)"
                      items={goals.map(g => ({ name: g.title, percentage: Math.round(g.completion_percentage || 0) }))}
                    />
                  </div>
                  <div>
                    <ProgressChart 
                      title="Completed vs Remaining"
                      type="pie"
                      data={[
                        { name: 'Completed', value: goals.filter(g => (g.current_progress || 0) >= g.target_count).length },
                        { name: 'Remaining', value: goals.filter(g => (g.current_progress || 0) < g.target_count).length },
                      ]}
                      height={280}
                    />
                  </div>
                </div>

                {/* Time-based analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <MonthlyTotalsChart months={12} height={320} />
                  </div>
                  <div>
                    <GoalMonthlyTrendChart months={6} topN={5} height={320} />
                  </div>
                </div>
              </>
            )}

          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;