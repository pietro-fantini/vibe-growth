-- Fix for immutable generated columns: replace with normal columns + triggers

-- 1) Ensure events.month_start is a normal column
ALTER TABLE public.progress_change_events DROP COLUMN IF EXISTS month_start;
ALTER TABLE public.progress_change_events ADD COLUMN IF NOT EXISTS month_start DATE;

-- 2) Add helper function to parse period text -> date (immutable)
CREATE OR REPLACE FUNCTION public.set_period_month_from_text(_period TEXT)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT to_date((_period || '-01'), 'YYYY-MM-DD');
$$;

-- 3) Add period_month to progress tables (normal column)
ALTER TABLE public.goal_progress ADD COLUMN IF NOT EXISTS period_month DATE;
ALTER TABLE public.subgoal_progress ADD COLUMN IF NOT EXISTS period_month DATE;

-- 4) Triggers to populate/maintain these columns
CREATE OR REPLACE FUNCTION public.trg_set_goal_progress_period_month()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.period_month := public.set_period_month_from_text(NEW.period);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_set_subgoal_progress_period_month()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.period_month := public.set_period_month_from_text(NEW.period);
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER set_goal_progress_period_month
  BEFORE INSERT OR UPDATE ON public.goal_progress
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_goal_progress_period_month();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER set_subgoal_progress_period_month
  BEFORE INSERT OR UPDATE ON public.subgoal_progress
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_subgoal_progress_period_month();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5) Trigger to populate events.month_start based on occurred_at
CREATE OR REPLACE FUNCTION public.trg_set_events_month_start()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.month_start := date_trunc('month', NEW.occurred_at)::date;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER set_events_month_start
  BEFORE INSERT OR UPDATE ON public.progress_change_events
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_events_month_start();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6) Recreate indexes now that columns exist
CREATE INDEX IF NOT EXISTS idx_goal_progress_period_month ON public.goal_progress (period_month, goal_id);
CREATE INDEX IF NOT EXISTS idx_subgoal_progress_period_month ON public.subgoal_progress (period_month, subgoal_id);
CREATE INDEX IF NOT EXISTS idx_events_user_month ON public.progress_change_events (user_id, month_start);
CREATE INDEX IF NOT EXISTS idx_events_entity ON public.progress_change_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON public.progress_change_events (occurred_at);

-- 7) Recreate analytics views (in case previous attempt partially failed)
CREATE OR REPLACE VIEW public.monthly_goal_progress_view AS
SELECT 
  g.user_id,
  gp.goal_id,
  g.title,
  gp.period_month AS month_start,
  gp.completed_count,
  g.target_count,
  CASE WHEN g.target_count > 0 THEN (gp.completed_count::numeric / g.target_count::numeric) ELSE NULL END AS completion_percentage
FROM public.goal_progress gp
JOIN public.goals g ON g.id = gp.goal_id;

CREATE OR REPLACE VIEW public.monthly_user_totals_view AS
SELECT 
  g.user_id,
  gp.period_month AS month_start,
  SUM(gp.completed_count) AS total_completed
FROM public.goal_progress gp
JOIN public.goals g ON g.id = gp.goal_id
GROUP BY g.user_id, gp.period_month;