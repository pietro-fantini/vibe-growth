-- 1) Types
DO $$ BEGIN
  CREATE TYPE public.progress_entity AS ENUM ('goal', 'subgoal');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Events table
CREATE TABLE IF NOT EXISTS public.progress_change_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_type public.progress_entity NOT NULL,
  entity_id UUID NOT NULL,
  delta INTEGER NOT NULL,
  new_value INTEGER NOT NULL,
  period TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  month_start DATE GENERATED ALWAYS AS (date_trunc('month', occurred_at)::date) STORED
);

-- Enable RLS
ALTER TABLE public.progress_change_events ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  CREATE POLICY "Users can view their own events"
  ON public.progress_change_events
  FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert their own events and service role can insert"
  ON public.progress_change_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- (No UPDATE/DELETE by users; events are append-only)

-- 3) Add month columns to progress tables
ALTER TABLE public.goal_progress 
  ADD COLUMN IF NOT EXISTS period_month DATE GENERATED ALWAYS AS (to_date((period || '-01'), 'YYYY-MM-DD')) STORED;

ALTER TABLE public.subgoal_progress 
  ADD COLUMN IF NOT EXISTS period_month DATE GENERATED ALWAYS AS (to_date((period || '-01'), 'YYYY-MM-DD')) STORED;

-- 4) Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_goal_progress_period_month ON public.goal_progress (period_month, goal_id);
CREATE INDEX IF NOT EXISTS idx_subgoal_progress_period_month ON public.subgoal_progress (period_month, subgoal_id);
CREATE INDEX IF NOT EXISTS idx_events_user_month ON public.progress_change_events (user_id, month_start);
CREATE INDEX IF NOT EXISTS idx_events_entity ON public.progress_change_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON public.progress_change_events (occurred_at);

-- 5) Trigger functions to log changes
CREATE OR REPLACE FUNCTION public.trg_log_goal_progress_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _user_id UUID;
  _goal_id UUID;
  _delta INTEGER := 0;
  _new_value INTEGER := 0;
  _period TEXT := NULL;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    _goal_id := NEW.goal_id;
    _new_value := NEW.completed_count;
    _delta := NEW.completed_count; -- from 0 to new value
    _period := NEW.period;
  ELSIF (TG_OP = 'UPDATE') THEN
    _goal_id := NEW.goal_id;
    _new_value := NEW.completed_count;
    _delta := NEW.completed_count - OLD.completed_count;
    _period := NEW.period;
  ELSIF (TG_OP = 'DELETE') THEN
    _goal_id := OLD.goal_id;
    _new_value := 0;
    _delta := -OLD.completed_count;
    _period := OLD.period;
  END IF;

  -- Skip if no actual change
  IF COALESCE(_delta, 0) = 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT g.user_id INTO _user_id FROM public.goals g WHERE g.id = _goal_id;

  INSERT INTO public.progress_change_events (user_id, entity_type, entity_id, delta, new_value, period)
  VALUES (_user_id, 'goal', _goal_id, _delta, _new_value, _period);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_log_subgoal_progress_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _user_id UUID;
  _subgoal_id UUID;
  _delta INTEGER := 0;
  _new_value INTEGER := 0;
  _period TEXT := NULL;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    _subgoal_id := NEW.subgoal_id;
    _new_value := NEW.completed_count;
    _delta := NEW.completed_count; -- from 0 to new value
    _period := NEW.period;
  ELSIF (TG_OP = 'UPDATE') THEN
    _subgoal_id := NEW.subgoal_id;
    _new_value := NEW.completed_count;
    _delta := NEW.completed_count - OLD.completed_count;
    _period := NEW.period;
  ELSIF (TG_OP = 'DELETE') THEN
    _subgoal_id := OLD.subgoal_id;
    _new_value := 0;
    _delta := -OLD.completed_count;
    _period := OLD.period;
  END IF;

  -- Skip if no actual change
  IF COALESCE(_delta, 0) = 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT s.user_id INTO _user_id FROM public.subgoals s WHERE s.id = _subgoal_id;

  INSERT INTO public.progress_change_events (user_id, entity_type, entity_id, delta, new_value, period)
  VALUES (_user_id, 'subgoal', _subgoal_id, _delta, _new_value, _period);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6) Attach triggers
DO $$ BEGIN
  CREATE TRIGGER log_goal_progress_change
  AFTER INSERT OR UPDATE OR DELETE ON public.goal_progress
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_goal_progress_change();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER log_subgoal_progress_change
  AFTER INSERT OR UPDATE OR DELETE ON public.subgoal_progress
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_subgoal_progress_change();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7) Analytics views
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