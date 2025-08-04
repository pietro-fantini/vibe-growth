-- Fix security issues: Remove SECURITY DEFINER from views and add SET search_path to functions

-- Drop and recreate views without SECURITY DEFINER
DROP VIEW IF EXISTS public.goal_history;
DROP VIEW IF EXISTS public.current_goal_progress;

-- Recreate views without SECURITY DEFINER (they will inherit permissions normally)
CREATE VIEW public.goal_history AS
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

CREATE VIEW public.current_goal_progress AS
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

-- Fix functions by adding SET search_path for security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_period()
RETURNS TEXT 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RETURN TO_CHAR(CURRENT_DATE, 'YYYY-MM');
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_goal_progress(
    goal_uuid UUID,
    increment_by INTEGER DEFAULT 1
)
RETURNS public.goal_progress 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.initialize_monthly_progress()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;