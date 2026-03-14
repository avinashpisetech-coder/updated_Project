# EIRMS — Database SQL Files

All Supabase/PostgreSQL schema, RLS policies, and functions are maintained here as **versioned SQL files**. Do not use Supabase CLI for migrations.

## Naming

- **Format**: `vNNN_short_description.sql` (e.g. `v001_initial_schema.sql`, `v002_tickets_and_activities.sql`).
- Use zero-padded numbers (001, 002, …) so files sort in execution order.
- One logical change per file.

## Running

Run files **manually** in order (v001 → v002 → …) in Supabase Dashboard → SQL Editor (or your preferred Postgres client). Track which version is applied in your environment outside this repo if needed.

## Order

Execute in ascending version order. Some files may depend on previous ones (e.g. RLS after tables exist); file headers may note dependencies.
