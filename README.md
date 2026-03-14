# EIRMS — Enterprise Issue & Request Management System

Unified portal for internal issues and requests: **Help Desk**, **ERP**, and **General** modules, plus IT Asset & Stock Management. Built with Next.js, Supabase, and Shadcn/ui.

## Current stage (init complete)

- **Next.js** (App Router) + **Shadcn/ui** + **Tailwind** — already set up
- **Supabase** — client helpers (server, client, middleware) and session refresh in middleware
- **Route structure** — `(auth)/login` placeholder; root landing page
- **Database** — versioned SQL in `db/` (no Supabase CLI). Run scripts manually in Supabase SQL Editor.
- **First schema** — `db/v001_initial_schema.sql`: departments, profiles, modules + minimal RLS

**Next implementation phase:** Phase 1 — Foundation & User Auth (see [Implementation Plan](docs/EIRMS_Implementation_Plan.md)).

## Tech stack

- **Runtime / package manager:** Bun  
- **Framework:** Next.js (App Router)  
- **Database / Auth:** Supabase (PostgreSQL + Auth)  
- **UI:** Shadcn/ui + Tailwind CSS  

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Environment variables

Copy the example env and set your Supabase project values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase Dashboard → Project Settings → API  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key from the same page  

### 3. Database (Supabase)

We do **not** use Supabase CLI for migrations. All SQL is in `db/` with version prefixes.

1. Create a Supabase project at [supabase.com](https://supabase.com).  
2. Open **SQL Editor** in the dashboard.  
3. Run the scripts in order:
   - `db/v001_initial_schema.sql` — creates departments, profiles, modules and minimal RLS  

Run each file manually; track which versions you’ve applied in your environment.

### 4. Run the app

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the EIRMS landing page and a **Log in** link to the placeholder login page.

## Project layout

- `src/app/` — App Router: `(auth)/login`, root page, layout  
- `src/lib/supabase/` — Supabase server client, browser client, middleware helper  
- `src/middleware.ts` — Session refresh for Supabase Auth  
- `db/` — Versioned SQL (run manually in Supabase)  
- `docs/` — PRD, Architecture Plan, Implementation Plan  

## Docs

- [EIRMS Implementation Plan](docs/EIRMS_Implementation_Plan.md) — phase-wise plan and next steps  
- [EIRMS PRD v3](docs/EIRMS_PRD_v3_Updated.md) — product requirements  
- [EIRMS Architecture Plan](docs/EIRMS_Architecture_Plan.md) — technical architecture  

## Scripts

| Command       | Description        |
|---------------|--------------------|
| `bun run dev` | Start dev server   |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint         |
