# EIRMS — Database Guide

How we manage schema, migrations, and SQL in EIRMS.

---

## 1. Approach

- **No Supabase CLI migrations.** All SQL is maintained as **versioned files** in the `db/` directory.
- Scripts are **run manually** (e.g. in Supabase Dashboard → SQL Editor or your own Postgres client).
- You are responsible for **running files in order** and tracking which versions are applied in each environment.

---

## 2. File naming

- **Pattern:** `vNNN_short_description.sql`
- **Examples:** `v001_initial_schema.sql`, `v002_profile_insert_and_audit.sql`, `v004_add_tickets.sql`
- Use **zero-padded** numbers (001, 002, …) so alphabetical order matches execution order.
- One logical change per file (e.g. one migration or one set of related objects).

---

## 3. File contents

- **Schema:** `CREATE TABLE`, `ALTER TABLE`, enums, indexes.
- **RLS:** `CREATE POLICY`, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- **Functions / RPCs:** Stored procedures, triggers, cron jobs.
- **Seed data:** Reference data (e.g. default modules); use `WHERE NOT EXISTS` or `ON CONFLICT` so reruns are safe.

Start each file with a short comment: purpose and any dependency (e.g. “Run after v002”).

---

## 4. Current files (Phase 1)

| File | Purpose |
|------|---------|
| `v001_initial_schema.sql` | departments, profiles, modules; enums; minimal RLS |
| `v002_profile_insert_and_audit.sql` | Allow insert own profile; `audit_log` table |
| `v003_seed_modules.sql` | Seed Help Desk, ERP, General modules |

See `db/README.md` in the repo for the same list and any updates.

---

## 5. Running migrations

1. Open Supabase Dashboard → **SQL Editor** (or connect with any Postgres client).
2. Run files in order: v001 → v002 → v003 → ….
3. If a file fails, fix the cause (e.g. object already exists, missing dependency) and re-run as needed.
4. Keep a note of the **last applied version** per environment (e.g. “Production: v003”).

---

## 6. Schema overview (from Architecture)

- **Auth:** Supabase `auth.users`; we extend with `public.profiles` (id = auth.uid()).
- **Core:** `departments`, `profiles`, `modules`; later `categories`, `sub_categories`, `sla_policies`, `module_agents`, etc.
- **Ticketing (Phase 2):** `tickets`, `ticket_activities`, `ticket_chat_messages`, `ticket_attachments`, etc.
- **Assets (Phase 4):** `asset_sub_types`, `assets`, `stock_movements`, `asset_photos`, etc.
- **Audit:** `audit_log` for security and compliance (e.g. login, password change, user CRUD).

All tables use `created_at` / `updated_at` where applicable; RLS is enabled on every table.

---

## 7. Adding a new migration

1. Add `db/vNNN_description.sql` (next number after the latest).
2. In the file: comment at top, then DDL/seed (and RLS if needed).
3. Run it manually in your environment(s).
4. Update `db/README.md` (and this doc if you want) with the new file and purpose.
