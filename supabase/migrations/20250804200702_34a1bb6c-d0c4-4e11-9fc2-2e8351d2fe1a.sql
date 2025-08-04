-- Create enum for goal types
CREATE TYPE public.goal_type AS ENUM ('one_time', 'recurring');

-- Create goals table
CREATE TABLE public.goals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type public.goal_type NOT NULL,
    target_count INTEGER NOT NULL DEFAULT 1,
    frequency TEXT, -- 'monthly', 'weekly', etc. Only used for recurring goals
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE, -- Only for one_time goals
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create goal_progress table to track progress over time
CREATE TABLE public.goal_progress (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    period TEXT NOT NULL, -- Format: 'YYYY-MM' for monthly tracking
    completed_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Ensure unique progress tracking per goal per period
    UNIQUE(goal_id, period)
);

-- Enable Row Level Security
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goals table
CREATE POLICY "Users can view their own goals" 
ON public.goals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals" 
ON public.goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" 
ON public.goals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" 
ON public.goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for goal_progress table
CREATE POLICY "Users can view progress for their own goals" 
ON public.goal_progress 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.goals 
    WHERE goals.id = goal_progress.goal_id 
    AND goals.user_id = auth.uid()
));

CREATE POLICY "Users can create progress for their own goals" 
ON public.goal_progress 
FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM public.goals 
    WHERE goals.id = goal_progress.goal_id 
    AND goals.user_id = auth.uid()
));

CREATE POLICY "Users can update progress for their own goals" 
ON public.goal_progress 
FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM public.goals 
    WHERE goals.id = goal_progress.goal_id 
    AND goals.user_id = auth.uid()
));

CREATE POLICY "Users can delete progress for their own goals" 
ON public.goal_progress 
FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM public.goals 
    WHERE goals.id = goal_progress.goal_id 
    AND goals.user_id = auth.uid()
));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goal_progress_updated_at
    BEFORE UPDATE ON public.goal_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to get current month period string
CREATE OR REPLACE FUNCTION public.get_current_period()
RETURNS TEXT AS $$
BEGIN
    RETURN TO_CHAR(CURRENT_DATE, 'YYYY-MM');
END;
$$ LANGUAGE plpgsql;

-- Helper function to increment goal progress
CREATE OR REPLACE FUNCTION public.increment_goal_progress(
    goal_uuid UUID,
    increment_by INTEGER DEFAULT 1
)
RETURNS public.goal_progress AS $$
DECLARE
    current_period TEXT := public.get_current_period();
    progress_record public.goal_progress;
BEGIN
    -- Insert or update progress for current period
    INSERT INTO public.goal_progress (goal_id, period, completed_count)
    VALUES (goal_uuid, current_period, increment_by)
    ON CONFLICT (goal_id, period)
    DO UPDATE SET 
        completed_count = goal_progress.completed_count + increment_by,
        updated_at = now()
    RETURNING * INTO progress_record;
    
    RETURN progress_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to initialize monthly progress for recurring goals
CREATE OR REPLACE FUNCTION public.initialize_monthly_progress()
RETURNS void AS $$
DECLARE
    current_period TEXT := public.get_current_period();
BEGIN
    -- Create progress records for all active recurring goals that don't have current month progress
    INSERT INTO public.goal_progress (goal_id, period, completed_count)
    SELECT 
        g.id,
        current_period,
        0
    FROM public.goals g
    WHERE g.type = 'recurring' 
    AND g.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM public.goal_progress gp 
        WHERE gp.goal_id = g.id 
        AND gp.period = current_period
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for goal history with progress
CREATE OR REPLACE VIEW public.goal_history AS
SELECT 
    g.id as goal_id,
    g.user_id,
    g.title,
    g.type,
    g.target_count,
    g.frequency,
    g.start_date,
    g.end_date,
    g.is_active,
    gp.period,
    gp.completed_count,
    CASE 
        WHEN g.target_count > 0 THEN 
            ROUND((gp.completed_count::DECIMAL / g.target_count) * 100, 2)
        ELSE 0 
    END as completion_percentage,
    gp.created_at as progress_created_at,
    gp.updated_at as progress_updated_at
FROM public.goals g
LEFT JOIN public.goal_progress gp ON g.id = gp.goal_id
ORDER BY g.created_at DESC, gp.period DESC;

-- Create view for current month progress
CREATE OR REPLACE VIEW public.current_goal_progress AS
SELECT 
    g.*,
    COALESCE(gp.completed_count, 0) as current_progress,
    CASE 
        WHEN g.target_count > 0 THEN 
            ROUND((COALESCE(gp.completed_count, 0)::DECIMAL / g.target_count) * 100, 2)
        ELSE 0 
    END as completion_percentage
FROM public.goals g
LEFT JOIN public.goal_progress gp ON g.id = gp.goal_id 
    AND gp.period = public.get_current_period()
WHERE g.is_active = true;