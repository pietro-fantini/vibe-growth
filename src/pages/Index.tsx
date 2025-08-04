import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trash2, Edit2, Plus, Check, X, LogOut, Target, Loader2, Minus, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
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
  const [newGoalColor, setNewGoalColor] = useState("#6366f1");
  const [showAddGoalDialog, setShowAddGoalDialog] = useState(false);
  const [newSubgoalText, setNewSubgoalText] = useState("");
  const [newSubgoalType, setNewSubgoalType] = useState<'one_time' | 'recurring'>('one_time');
  const [newSubgoalTarget, setNewSubgoalTarget] = useState("1");
  const [editingSubgoalTitle, setEditingSubgoalTitle] = useState("");

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

      // Fetch subgoals for each goal
      const { data: subgoalsData, error: subgoalsError } = await supabase
        .from('subgoals')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (subgoalsError) throw subgoalsError;

      // Fetch subgoal progress
      const { data: subgoalProgressData, error: subgoalProgressError } = await supabase
        .from('subgoal_progress')
        .select('*');

      if (subgoalProgressError) throw subgoalProgressError;

      // Merge goals with their progress and subgoals
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
          target_count: parseInt(newGoalTarget) || 5,
          background_color: newGoalColor,
          user_id: user.id
        });

      if (error) throw error;

      await fetchGoals();
      setNewGoalText("");
      setNewGoalTarget("5");
      setNewGoalColor("#6366f1");
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
      setNewGoalColor("#6366f1");
      
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
    try {
      const functionName = increment ? 'handle_subgoal_completion' : 'handle_subgoal_decrement';
      const { error } = await supabase.rpc(functionName, {
        subgoal_uuid: subgoalId,
        [increment ? 'increment_by' : 'decrement_by']: 1
      });

      if (error) throw error;

      await fetchGoals();
      
      toast({
        description: increment ? "✅ Progress added!" : "↩️ Progress removed!",
      });
    } catch (error) {
      console.error('Error updating subgoal progress:', error);
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
        <div className="flex justify-between items-center">
          <div className="text-center space-y-2 flex-1">
            <div className="flex justify-center items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center shadow-primary">
                <Target className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Hurry Up!
              </h1>
            </div>
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
        <div className="flex justify-center">
          <Dialog open={showAddGoalDialog} onOpenChange={setShowAddGoalDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:shadow-primary transition-smooth">
                <Plus className="h-4 w-4 mr-2" />
                Add New Goal
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
                  <Input
                    type="color"
                    value={newGoalColor}
                    onChange={(e) => setNewGoalColor(e.target.value)}
                    className="w-full h-10"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddGoalDialog(false);
                      setNewGoalText("");
                      setNewGoalTarget("5");
                      setNewGoalColor("#6366f1");
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
                              setNewGoalColor(goal.background_color || "#6366f1");
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
                        <Input
                          type="color"
                          value={newGoalColor}
                          onChange={(e) => setNewGoalColor(e.target.value)}
                          className="w-full h-10"
                        />
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
                            setNewGoalColor("#6366f1");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
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
                              <div key={subgoal.id} className="p-2 bg-muted/20 rounded">
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
                                 <Badge variant="outline" className="text-xs">
                                   {subgoal.current_progress || 0}/{subgoal.target_count}
                                 </Badge>
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
      </div>
    </div>
  );
};

export default Index;