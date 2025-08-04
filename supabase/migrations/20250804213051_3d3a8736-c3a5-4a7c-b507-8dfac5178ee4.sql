-- Create function to recalculate goal progress based on actual completed subgoals
CREATE OR REPLACE FUNCTION public.recalculate_goal_progress(goal_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    current_period TEXT := public.get_current_period();
    total_completed INTEGER := 0;
    subgoal_record RECORD;
BEGIN
    -- Count how many active subgoals have been completed for this goal
    FOR subgoal_record IN 
        SELECT s.id, s.target_count, COALESCE(sp.completed_count, 0) as progress
        FROM public.subgoals s
        LEFT JOIN public.subgoal_progress sp ON s.id = sp.subgoal_id AND sp.period = current_period
        WHERE s.goal_id = goal_uuid AND s.is_active = true
    LOOP
        -- If subgoal progress meets or exceeds target, count it as 1 completion
        IF subgoal_record.progress >= subgoal_record.target_count THEN
            total_completed := total_completed + 1;
        END IF;
    END LOOP;
    
    -- Update the goal progress to match the actual completed subgoals
    INSERT INTO public.goal_progress (goal_id, period, completed_count)
    VALUES (goal_uuid, current_period, total_completed)
    ON CONFLICT (goal_id, period)
    DO UPDATE SET 
        completed_count = total_completed,
        updated_at = now();
END;
$function$;

-- Update the delete subgoal function to recalculate goal progress
CREATE OR REPLACE FUNCTION public.delete_subgoal_and_recalculate(subgoal_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    parent_goal_id UUID;
BEGIN
    -- Get the parent goal id
    SELECT goal_id INTO parent_goal_id
    FROM public.subgoals 
    WHERE id = subgoal_uuid;
    
    -- Mark subgoal as inactive
    UPDATE public.subgoals 
    SET is_active = false, updated_at = now()
    WHERE id = subgoal_uuid;
    
    -- Recalculate the parent goal's progress based on remaining active subgoals
    PERFORM public.recalculate_goal_progress(parent_goal_id);
END;
$function$;