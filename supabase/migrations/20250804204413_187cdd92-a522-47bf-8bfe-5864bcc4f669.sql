-- Create subgoals table
CREATE TABLE public.subgoals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL,
  title TEXT NOT NULL,
  type goal_type NOT NULL,
  user_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subgoals ENABLE ROW LEVEL SECURITY;

-- Create policies for subgoals
CREATE POLICY "Users can view their own subgoals" 
ON public.subgoals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subgoals" 
ON public.subgoals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subgoals" 
ON public.subgoals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subgoals" 
ON public.subgoals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create subgoal progress table
CREATE TABLE public.subgoal_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subgoal_id UUID NOT NULL,
  period TEXT NOT NULL,
  completed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(subgoal_id, period)
);

-- Enable Row Level Security
ALTER TABLE public.subgoal_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for subgoal progress
CREATE POLICY "Users can view progress for their own subgoals" 
ON public.subgoal_progress 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM subgoals 
  WHERE subgoals.id = subgoal_progress.subgoal_id 
  AND subgoals.user_id = auth.uid()
));

CREATE POLICY "Users can create progress for their own subgoals" 
ON public.subgoal_progress 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM subgoals 
  WHERE subgoals.id = subgoal_progress.subgoal_id 
  AND subgoals.user_id = auth.uid()
));

CREATE POLICY "Users can update progress for their own subgoals" 
ON public.subgoal_progress 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM subgoals 
  WHERE subgoals.id = subgoal_progress.subgoal_id 
  AND subgoals.user_id = auth.uid()
));

CREATE POLICY "Users can delete progress for their own subgoals" 
ON public.subgoal_progress 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM subgoals 
  WHERE subgoals.id = subgoal_progress.subgoal_id 
  AND subgoals.user_id = auth.uid()
));

-- Add trigger for timestamps
CREATE TRIGGER update_subgoals_updated_at
BEFORE UPDATE ON public.subgoals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subgoal_progress_updated_at
BEFORE UPDATE ON public.subgoal_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment subgoal progress and parent goal progress
CREATE OR REPLACE FUNCTION public.increment_subgoal_progress(subgoal_uuid uuid, increment_by integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    current_period TEXT := public.get_current_period();
    parent_goal_id UUID;
BEGIN
    -- Get the parent goal id
    SELECT goal_id INTO parent_goal_id
    FROM public.subgoals 
    WHERE id = subgoal_uuid;
    
    -- Insert or update subgoal progress for current period
    INSERT INTO public.subgoal_progress (subgoal_id, period, completed_count)
    VALUES (subgoal_uuid, current_period, increment_by)
    ON CONFLICT (subgoal_id, period)
    DO UPDATE SET 
        completed_count = subgoal_progress.completed_count + increment_by,
        updated_at = now();
    
    -- Also increment the parent goal progress
    PERFORM public.increment_goal_progress(parent_goal_id, increment_by);
END;
$function$;

-- Function to decrement subgoal progress and parent goal progress
CREATE OR REPLACE FUNCTION public.decrement_subgoal_progress(subgoal_uuid uuid, decrement_by integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    current_period TEXT := public.get_current_period();
    parent_goal_id UUID;
    current_count INTEGER;
BEGIN
    -- Get the parent goal id
    SELECT goal_id INTO parent_goal_id
    FROM public.subgoals 
    WHERE id = subgoal_uuid;
    
    -- Get current count for this period
    SELECT completed_count INTO current_count
    FROM public.subgoal_progress
    WHERE subgoal_id = subgoal_uuid AND period = current_period;
    
    -- Only decrement if we have progress to remove
    IF current_count > 0 THEN
        -- Update subgoal progress
        UPDATE public.subgoal_progress 
        SET completed_count = GREATEST(0, completed_count - decrement_by),
            updated_at = now()
        WHERE subgoal_id = subgoal_uuid AND period = current_period;
        
        -- Also decrement the parent goal progress
        UPDATE public.goal_progress 
        SET completed_count = GREATEST(0, completed_count - decrement_by),
            updated_at = now()
        WHERE goal_id = parent_goal_id AND period = current_period;
    END IF;
END;
$function$;

-- Update the target count for all goals to 5 as requested
UPDATE public.goals SET target_count = 5;

-- Create view for subgoals with current progress
CREATE OR REPLACE VIEW public.current_subgoal_progress AS
SELECT 
    s.id,
    s.goal_id,
    s.title,
    s.type,
    s.user_id,
    s.is_active,
    s.created_at,
    s.updated_at,
    COALESCE(sp.completed_count, 0) as current_progress,
    CASE 
        WHEN s.type = 'one_time' THEN 
            CASE WHEN COALESCE(sp.completed_count, 0) >= 1 THEN 100.0 ELSE (COALESCE(sp.completed_count, 0)::numeric / 1) * 100 END
        ELSE 
            (COALESCE(sp.completed_count, 0)::numeric / 5) * 100
    END as completion_percentage
FROM public.subgoals s
LEFT JOIN public.subgoal_progress sp ON s.id = sp.subgoal_id 
    AND sp.period = public.get_current_period()
WHERE s.is_active = true;