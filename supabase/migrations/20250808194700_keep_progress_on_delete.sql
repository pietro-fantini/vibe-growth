-- Ensure deleting a completed subgoal does NOT reduce goal progress or analytics
CREATE OR REPLACE FUNCTION public.delete_subgoal_and_recalculate(subgoal_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  parent_goal_id UUID;
  current_period TEXT := public.get_current_period();
  subgoal_target INTEGER := 1;
  current_progress INTEGER := 0;
  was_completed BOOLEAN := false;
BEGIN
  -- Resolve parent, target and current progress for this month
  SELECT s.goal_id, COALESCE(s.target_count, 1)
  INTO parent_goal_id, subgoal_target
  FROM public.subgoals s
  WHERE s.id = subgoal_uuid;

  IF parent_goal_id IS NULL THEN
    RETURN; -- nothing to do
  END IF;

  SELECT COALESCE(sp.completed_count, 0)
  INTO current_progress
  FROM public.subgoal_progress sp
  WHERE sp.subgoal_id = subgoal_uuid AND sp.period = current_period;

  was_completed := current_progress >= subgoal_target;

  -- Deactivate the subgoal (soft-delete)
  UPDATE public.subgoals 
  SET is_active = false, updated_at = now()
  WHERE id = subgoal_uuid;

  -- Preserve goal progress if this subgoal had already contributed
  IF NOT was_completed THEN
    PERFORM public.recalculate_goal_progress(parent_goal_id);
  END IF;
END;
$function$;

