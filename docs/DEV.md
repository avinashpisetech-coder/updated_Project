# EIRMS — Developer Guide

Guide for anyone developing or contributing to EIRMS. For product and architecture context, see the [doc index](#document-index) below.

---

## 1. Overview

- **Product:** Enterprise Issue & Request Management System — unified portal for internal issues/requests (Help Desk, ERP, General) and IT Asset & Stock Management.
- **Stack:** Next.js (App Router), Supabase (PostgreSQL + Auth), Shadcn/ui + Tailwind, **Bun** for runtime and package manager.
- **Conventions:** Cursor rules in `.cursor/rules/`, versioned SQL in `db/` (no Supabase CLI), functional/declarative TypeScript.

---

## 2. Prerequisites

- **Bun** — [bun.sh](https://bun.sh)
- **Node.js** 20+ (if any tooling expects it)
- **Supabase account** — [supabase.com](https://supabase.com)
- **Git**

---

## 3. Getting started

### 3.1 Clone and install

```bash
git clone <repo-url>
cd ticketing-tool
bun install
```

### 3.2 Environment

```bash
cp .env.example .env.local
```

Set in `.env.local`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_SITE_URL` | App URL for redirects (e.g. `http://localhost:3000` in dev) |

Optional (e.g. admin flows, server-only):

- `SUPABASE_SERVICE_ROLE_KEY` — use only in trusted server code, never expose to client.

### 3.3 Database

We **do not** use Supabase CLI for migrations. All schema and migrations live as versioned SQL files in `db/`.

1. Create a Supabase project and open **SQL Editor**.
2. Run files in order: `v001_initial_schema.sql` → `v002_profile_insert_and_audit.sql` → `v003_seed_modules.sql`.
3. Track which versions you’ve applied (e.g. in a local note or runbook).

See [Database](database.md) for naming and workflow.

### 3.4 Run the app

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Create a test user in Supabase Dashboard → Authentication → Users, then sign in at `/login`.

---

## 4. Project structure

```
ticketing-tool/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Login, forgot-password, reset-password
│   │   │   ├── actions.ts      # signIn, requestPasswordReset, updatePassword, signOut
│   │   │   ├── login/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/        # Protected: dashboard, profile
│   │   │   ├── layout.tsx      # Header, ensureProfile, force-password redirect
│   │   │   ├── dashboard/
│   │   │   └── profile/
│   │   ├── change-password/    # Force change / profile change password
│   │   ├── api/
│   │   │   └── auth/signout/   # POST sign out
│   │   ├── layout.tsx
│   │   └── page.tsx            # Landing
│   ├── components/
│   │   └── ui/                 # Shadcn components
│   ├── lib/
│   │   ├── supabase/           # server, client, middleware Supabase helpers
│   │   ├── ensure-profile.ts   # Create profile on first login
│   │   ├── profile.ts         # Derive profile fields from auth user
│   │   └── utils.ts
│   └── middleware.ts          # Session refresh + route protection
├── db/                         # Versioned SQL (run manually)
│   ├── README.md
│   ├── v001_initial_schema.sql
│   ├── v002_profile_insert_and_audit.sql
│   └── v003_seed_modules.sql
├── docs/                       # PRD, architecture, implementation plan, dev docs
├── .cursor/rules/              # Cursor AI rules (EIRMS, Next.js, Supabase, Shadcn, Bun)
├── .env.example
├── package.json
└── next.config.ts
```

---

## 5. Conventions

### 5.1 Commands

- Use **Bun** for install and scripts: `bun install`, `bun run dev`, `bun run build`, `bunx <cli>`.

### 5.2 Code style

- TypeScript strict; functional components; no classes.
- Descriptive names (e.g. `isLoading`, `hasError`).
- Guard clauses and early returns for errors; avoid empty `catch`.
- Directory names: lowercase with dashes (e.g. `auth-wizard`).

### 5.3 Supabase

- **Server** (RSC, Server Actions, API routes): `import { createClient } from "@/lib/supabase/server"` and `await createClient()`.
- **Client** (browser): `import { createClient } from "@/lib/supabase/client"` and `createClient()`.
- **Middleware**: session refresh and redirect logic live in `@/lib/supabase/middleware`; `src/middleware.ts` calls it.

### 5.4 Forms and validation

- Server Actions for mutations; validate with **Zod** (e.g. in `actions.ts`).
- Use Shadcn form primitives (Input, Label, etc.) with `useActionState` for server actions and error display.

### 5.5 UI

- Prefer **Shadcn/ui** for new UI; add components via `bunx shadcn@latest add <component>`.
- Style with Tailwind; follow existing theme tokens in `globals.css`.

### 5.6 Database changes

- Add a new versioned file in `db/`, e.g. `v004_new_feature.sql`.
- Document in `db/README.md` and run manually in Supabase SQL Editor.

---

## 6. Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Next.js dev server |
| `bun run build` | Production build |
| `bun run start` | Run production server |
| `bun run lint` | Run ESLint |

---

## 7. Auth flow (reference)

- **Login:** `/login` → Server Action `signIn` → Supabase `signInWithPassword` → redirect `/dashboard`.
- **Dashboard layout:** Ensures profile exists (`ensureProfile`), redirects to `/change-password` if `profiles.force_password_change`.
- **Sign out:** Form POST to `/api/auth/signout` → Supabase `signOut` → redirect `/login`.
- **Forgot password:** `/forgot-password` → `requestPasswordReset` → Supabase `resetPasswordForEmail`; user follows email link to `/reset-password`.
- **Reset / Change password:** New password + confirm, Zod policy (10+ chars, complexity); then `updateUser({ password })` and, for change-password, update `profiles.force_password_change` and `password_changed_at`.

---

## 8. Document index

| Document | Description |
|----------|-------------|
| [EIRMS_Implementation_Plan.md](EIRMS_Implementation_Plan.md) | Phase-wise implementation plan and acceptance criteria |
| [EIRMS_PRD_v3_Updated.md](EIRMS_PRD_v3_Updated.md) | Product requirements (ticketing, assets, auth, etc.) |
| [EIRMS_Architecture_Plan.md](EIRMS_Architecture_Plan.md) | Technical architecture (stack, schema, security) |
| [DEV.md](DEV.md) | This developer guide |
| [database.md](database.md) | Database and SQL file conventions |

---

## 9. Troubleshooting

- **"Invalid login"** — Check user exists in Supabase Auth and password is correct; ensure RLS allows read on `profiles` for `auth.uid()`.
- **Profile not created on first login** — Run `db/v002_profile_insert_and_audit.sql` so the "Allow insert own profile" policy exists.
- **Redirect loop** — Ensure middleware and layout redirect logic match (e.g. `/change-password` is protected but not under dashboard layout that forces redirect).
- **Reset password link wrong** — Set `NEXT_PUBLIC_SITE_URL` in `.env.local` to the URL where the app runs (e.g. `http://localhost:3000`).
