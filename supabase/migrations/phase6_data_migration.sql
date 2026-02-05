-- DATA MIGRATION: Contents -> Videos
-- Run this AFTER phase6.sql (tables created) but BEFORE phase6_fix_fks.sql (constraints added)

-- 1. Copy video data from 'contents' to 'videos'
-- deduplicating by youtube_id (external_id) and keeping the most recent one.
INSERT INTO public.videos (
    id, 
    youtube_id, 
    title, 
    description, 
    duration, 
    created_at, 
    updated_at
)
SELECT DISTINCT ON (external_id)
    id, 
    external_id, 
    title, 
    description, 
    COALESCE(duration_seconds, 0), 
    created_at, 
    created_at
FROM 
    public.contents
WHERE 
    type = 'video'
ORDER BY 
    external_id, created_at DESC
ON CONFLICT (youtube_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description;

-- 2. Result check
DO $$
DECLARE
    v_count INT;
    c_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.videos;
    SELECT COUNT(*) INTO c_count FROM public.contents WHERE type = 'video';
    RAISE NOTICE 'Migrated % videos. Source contents had % videos.', v_count, c_count;
END $$;
