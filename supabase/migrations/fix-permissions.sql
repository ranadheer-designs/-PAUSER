-- Fix database permissions for PAUSER application
-- Grant usage on schemas
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;

-- Grant all privileges on all tables in public schema to service_role (backend) and postgres (admin)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- Grant basic access to authenticated users (RLS will handle row-level security)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure future tables are also covered
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- Specific fix for the 42501 error on checkpoints and videos
-- Explicitly grant permissions to these tables to ensure they work
GRANT ALL ON TABLE public.videos TO service_role;
GRANT ALL ON TABLE public.checkpoints TO service_role;
GRANT ALL ON TABLE public.checkpoint_completions TO service_role;
GRANT ALL ON TABLE public.checkpoints_legacy TO service_role;
GRANT ALL ON TABLE public.user_skill_progression TO service_role;
GRANT ALL ON TABLE public.review_cards TO service_role;
GRANT ALL ON TABLE public.checkpoint_analytics TO service_role;
