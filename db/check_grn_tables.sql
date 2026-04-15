-- Check tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename ILIKE '%grn%';
