-- Fix the subgoal completion function to handle NULL values properly
CREATE OR REPLACE FUNCTION public.handle_subgoal_completion(subgoal_uuid uuid, increment_by integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    current_period TEXT := public.get_current_period();
    parent_goal_id UUID;
    subgoal_target INTEGER;
    old_progress INTEGER;
    new_progress INTEGER;
    was_completed BOOLEAN;
    is_now_completed BOOLEAN;
BEGIN
    -- Get the parent goal id and subgoal target
    SELECT goal_id, target_count INTO parent_goal_id, subgoal_target
    FROM public.subgoals 
    WHERE id = subgoal_uuid;
    
    -- Get current progress, defaulting to 0 if no record exists
    SELECT COALESCE(completed_count, 0) INTO old_progress
    FROM public.subgoal_progress
    WHERE subgoal_id = subgoal_uuid AND period = current_period;
    
    -- If no record found, old_progress will be NULL, so default to 0
    old_progress := COALESCE(old_progress, 0);
    
    -- Calculate new progress
    new_progress := old_progress + increment_by;
    
    -- Check completion status
    was_completed := old_progress >= subgoal_target;
    is_now_completed := new_progress >= subgoal_target;
    
    -- Insert or update subgoal progress for current period
    INSERT INTO public.subgoal_progress (subgoal_id, period, completed_count)
    VALUES (subgoal_uuid, current_period, new_progress)
    ON CONFLICT (subgoal_id, period)
    DO UPDATE SET 
        completed_count = new_progress,
        updated_at = now();
    
    -- Only increment parent goal if subgoal just became completed (crossed the threshold)
    IF NOT was_completed AND is_now_completed THEN
        PERFORM public.increment_goal_progress(parent_goal_id, 1);
    END IF;
END;
$function$;

-- Fix the subgoal decrement function to handle NULL values properly
CREATE OR REPLACE FUNCTION public.handle_subgoal_decrement(subgoal_uuid uuid, decrement_by integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    current_period TEXT := public.get_current_period();
    parent_goal_id UUID;
    subgoal_target INTEGER;
    old_progress INTEGER;
    new_progress INTEGER;
    was_completed BOOLEAN;
    is_now_incomplete BOOLEAN;
BEGIN
    -- Get the parent goal id and subgoal target
    SELECT goal_id, target_count INTO parent_goal_id, subgoal_target
    FROM public.subgoals 
    WHERE id = subgoal_uuid;
    
    -- Get current progress, defaulting to 0 if no record exists
    SELECT COALESCE(completed_count, 0) INTO old_progress
    FROM public.subgoal_progress
    WHERE subgoal_id = subgoal_uuid AND period = current_period;
    
    -- If no record found, old_progress will be NULL, so default to 0
    old_progress := COALESCE(old_progress, 0);
    
    -- Only decrement if we have progress to remove
    IF old_progress > 0 THEN
        -- Calculate new progress
        new_progress := GREATEST(0, old_progress - decrement_by);
        
        -- Check completion status
        was_completed := old_progress >= subgoal_target;
        is_now_incomplete := new_progress < subgoal_target;
        
        -- Update subgoal progress
        UPDATE public.subgoal_progress 
        SET completed_count = new_progress,
            updated_at = now()
        WHERE subgoal_id = subgoal_uuid AND period = current_period;
        
        -- Decrement parent goal if subgoal became incomplete (went below threshold)
        IF was_completed AND is_now_incomplete THEN
            UPDATE public.goal_progress 
            SET completed_count = GREATEST(0, completed_count - 1),
                updated_at = now()
            WHERE goal_id = parent_goal_id AND period = current_period;
        END IF;
    END IF;
END;
$function$;