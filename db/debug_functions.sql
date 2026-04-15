-- Global Search for Asset Inserts
SELECT proname FROM pg_proc JOIN pg_namespace n ON n.oid = pg_proc.pronamespace WHERE n.nspname = 'public' AND prosrc ILIKE '%INSERT INTO%assets%';
