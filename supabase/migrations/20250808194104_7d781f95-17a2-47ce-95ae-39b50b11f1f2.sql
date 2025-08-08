-- Complete migration for time-based analytics (idempotent)

-- 1) Enum type
DO $$ BEGIN
  CREATE TYPE public.progress_entity AS ENUM ('goal', 'subgoal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Events table (no generated columns)
CREATE TABLE IF NOT EXISTS public.progress_change_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_type public.progress_entity NOT NULL,
  entity_id UUID NOT NULL,
  delta INTEGER NOT NULL,
  new_value INTEGER NOT NULL,
  period TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  month_start DATE
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

-- 3) Helper function for period parsing (immutable)
CREATE OR REPLACE FUNCTION public.set_period_month_from_text(_period TEXT)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT to_date((_period || '-01'), 'YYYY-MM-DD');
$$;

-- 4) Add period_month columns to progress tables
ALTER TABLE public.goal_progress ADD COLUMN IF NOT EXISTS period_month DATE;
ALTER TABLE public.subgoal_progress ADD COLUMN IF NOT EXISTS period_month DATE;

-- 5) Triggers to populate/maintain these columns
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

-- 6) Trigger to populate events.month_start
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

-- 7) Trigger functions to log changes from progress tables into events
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

  IF COALESCE(_delta, 0) = 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT s.user_id INTO _user_id FROM public.subgoals s WHERE s.id = _subgoal_id;

  INSERT INTO public.progress_change_events (user_id, entity_type, entity_id, delta, new_value, period)
  VALUES (_user_id, 'subgoal', _subgoal_id, _delta, _new_value, _period);

  RETURN COALESCE(NEW, OLD);
END;
$$;

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

-- 8) Analytics views
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

-- Ensure subgoals are deactivated when a goal is deactivated
CREATE OR REPLACE FUNCTION public.trg_deactivate_subgoals_when_goal_inactive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_active = false AND OLD.is_active = true THEN
    UPDATE public.subgoals
    SET is_active = false, updated_at = now()
    WHERE goal_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_deactivate_subgoals_when_goal_inactive
  AFTER UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.trg_deactivate_subgoals_when_goal_inactive();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 9) Indexes
CREATE INDEX IF NOT EXISTS idx_goal_progress_period_month ON public.goal_progress (period_month, goal_id);
CREATE INDEX IF NOT EXISTS idx_subgoal_progress_period_month ON public.subgoal_progress (period_month, subgoal_id);
CREATE INDEX IF NOT EXISTS idx_events_user_month ON public.progress_change_events (user_id, month_start);
CREATE INDEX IF NOT EXISTS idx_events_entity ON public.progress_change_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON public.progress_change_events (occurred_at);