-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to run monthly subgoal cleanup on the last day of each month at 23:59
-- This will run the edge function to handle month-end subgoal logic
SELECT cron.schedule(
  'monthly-subgoal-cleanup',
  '59 23 28-31 * *', -- Run at 23:59 on days 28-31 of every month
  $$
  SELECT
    net.http_post(
        url:='https://inzcqenjspikefbsoagh.supabase.co/functions/v1/monthly-subgoal-cleanup',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluemNxZW5qc3Bpa2VmYnNvYWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMzYyMTUsImV4cCI6MjA2OTkxMjIxNX0.rbt6evXhiQXPkSfM_I2cVj08eeFsSKO30ZJhXat6vmg"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);