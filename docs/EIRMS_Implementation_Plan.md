# EIRMS — Phase-Wise Implementation Plan

**Enterprise Issue & Request Management System**  
Industry SaaS Implementation Plan · Phase 1 (33 Weeks)

| Attribute                  | Value                                |
| -------------------------- | ------------------------------------ |
| **Document Type**          | Implementation Plan                  |
| **PRD Reference**          | EIRMS_PRD_v3_Updated.md              |
| **Architecture Reference** | EIRMS_Architecture_Plan.md           |
| **Tech Stack**             | Next.js 15, Supabase, Shadcn/ui, Bun |
| **Total Duration**         | 33 weeks (~8 months)                 |
| **Classification**         | Internal — Confidential              |

---

## 1. Introduction

This plan breaks down the build of EIRMS into **phase-wise deliverables** with clear scope, dependencies, and acceptance criteria. It follows industry SaaS best practices: security-first design, RBAC and audit from day one, observable operations, and phased go-live with hypercare.

### 1.1 Principles

- **Security by design**: RLS on every table; no feature ships without auth and validation.
- **Audit trail**: All material actions logged; 24-month retention for compliance.
- **Incremental delivery**: Each phase produces testable, deployable value.
- **Change control**: Scope changes go through PRD/backlog; no ad-hoc scope creep.
- **Documentation**: Setup, runbooks, and API/schema docs updated per phase.
- **Versioned database**: All SQL in `db/` with version prefix (e.g. `v001_*.sql`); run manually (no Supabase CLI migrations).

### 1.2 Tech Stack (Mandatory)

| Layer                     | Technology                                     |
| ------------------------- | ---------------------------------------------- |
| Runtime / Package manager | **Bun**                                        |
| Framework                 | Next.js 15 (App Router)                        |
| Database                  | Supabase (PostgreSQL); versioned SQL in `db/`  |
| UI                        | Shadcn/ui + Tailwind CSS                       |
| Auth                      | Supabase Auth (OTP, MFA, sessions)             |
| State                     | TanStack Query, Zustand; React Hook Form + Zod |
| Email                     | Resend + React Email                           |
| Realtime                  | Supabase Realtime (chat, queue, presence)      |

---

## 2. Phase Overview

| Phase   | Name                                      | Weeks | PRD Alignment               |
| ------- | ----------------------------------------- | ----- | --------------------------- |
| **P0**  | Discovery & Design                        | 1–2   | Discovery & Design          |
| **P1**  | Foundation & User Auth                    | 3–5   | User Auth & Foundation      |
| **P2**  | 3-Module Ticketing                        | 6–13  | 3-Module Ticketing          |
| **P2A** | Notifications, SLA Aging & Admin Workflow | 13–14 | Ticketing Enhancements      |
| **P3**  | Meeting Scheduling                        | 15–16 | Meeting Scheduling          |
| **P4**  | IT Asset & Stock Mgmt                     | 16–22 | IT Asset & Stock Management |
| **P5**  | Reporting & Analytics                     | 23–24 | Reporting & Analytics       |
| **P6**  | Platform Settings & Branding              | 25–26 | Settings & Branding         |
| **P7**  | Security, Infra & Hardening               | 27–28 | Cloud & Security            |
| **P8**  | UAT & Training                            | 29–30 | UAT & Training              |
| **P9**  | Go-Live & Hypercare                       | 31–33 | Go-Live & Hypercare         |

---

## 3. Phase 0 — Discovery & Design (Weeks 1–2)

**Goal**: Stakeholder alignment, technical foundation, and design handoff so development can start without rework.

### 3.1 Scope

| #    | Deliverable              | Description                                                                                                                                          |
| ---- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1  | PRD sign-off             | Written approval from all stakeholders per PRD Section 15.                                                                                           |
| 0.2  | Turborepo + repo setup   | Monorepo with Bun: apps (e.g. web, email), packages (db, ui, types). CI (type-check, lint, test) on every PR.                                        |
| 0.3  | Supabase project         | Project created; Auth, Storage, Realtime, Edge Functions enabled. No CLI migrations; `db/` for versioned SQL.                                        |
| 0.4  | Next.js 15 scaffold      | App Router, TypeScript strict, Tailwind, Shadcn/ui init in apps/web. Middleware stub for auth.                                                       |
| 0.5  | DB schema v1 (versioned) | First SQL files in `db/`: profiles, departments, modules, categories, sla*policies (e.g. `v001*`*, `v002\_\*`). Run manually in Supabase SQL Editor. |
| 0.6  | Supabase client pattern  | `@supabase/ssr` server/client helpers; cookie-based sessions. Documented in README.                                                                  |
| 0.7  | Module & SLA workshops   | HODs agree on 3 modules (Help Desk, ERP, General), categories, sub-categories, and SLA values (P1–P4). Signed SLA matrix.                            |
| 0.8  | Asset type workshop      | IS/Admin agree on IT asset sub-types, mandatory fields, low-stock thresholds.                                                                        |
| 0.9  | UI/UX wireframes         | Figma (or equivalent) for: login, scope selector, ticket form, queue views, asset handover, key admin screens.                                       |
| 0.10 | Design tokens            | Shadcn theme aligned to branding (primary/secondary, fonts). Document in design system.                                                              |
| 0.11 | Vercel + env setup       | Vercel project linked to repo; env vars for Supabase, Resend; preview deployments.                                                                   |
| 0.12 | Day-1 runbook            | One-page: how to run app locally (Bun), run SQL from `db/`, and deploy to preview.                                                                   |

### 3.2 Dependencies

- None (entry phase).

### 3.3 Acceptance Criteria

- PRD signed off; change control process documented.
- `bun install` and `bun run dev` succeed; one versioned SQL file applied to Supabase.
- SLA and asset-type decisions documented and signed.
- Wireframes and theme tokens handed off to dev.

### 3.4 Risks & Mitigations

- **SLA disagreements**: Resolve in workshop; sign-off before P2 (PRD 14).
- **Scope creep**: All new asks go to Phase 2 backlog (PRD 14).

---

## 4. Phase 1 — Foundation & User Auth (Weeks 3–5)

**Goal**: Secure authentication, RBAC, and user lifecycle so all later features can enforce role and department boundaries.

### 4.1 Scope

| #    | Deliverable                                                                                                                | PRD / Feature                                                           |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1.1  | Auth: Email + password                                                                                                     | §3.2 Login                                                              |
| 1.2  | Auth: Forgot password (OTP email, 15 min, 3 attempts)                                                                      | §3.3 Forgot Password                                                    |
| 1.3  | Password policy (10 chars, complexity, last-5 no reuse, common-passwords block)                                            | §3.4 Password Policy                                                    |
| 1.4  | Force change on first login                                                                                                | §3.2, §3.4                                                              |
| 1.5  | Account lockout (5 attempts, 30 min / admin override)                                                                      | §3.2, §3.4                                                              |
| 1.6  | Session: 30 min idle timeout; Remember Me 30 days (disabled for admins)                                                    | §3.2                                                                    |
| 1.7  | Concurrent sessions (max 2, configurable)                                                                                  | §3.2                                                                    |
| 1.8  | MFA (TOTP) for Super Admin & Dept Admin                                                                                    | §3.2                                                                    |
| 1.9  | Profiles + RBAC                                                                                                            | §3.1 User CRUD — roles: super_admin, dept_admin, module_agent, end_user |
| 1.10 | User CRUD (create, view, edit, deactivate) with role-based permissions                                                     | §3.1                                                                    |
| 1.11 | Admin-created account + activation email (temp password)                                                                   | §3.2 User Registration                                                  |
| 1.12 | Bulk user import (Excel/CSV, validation, error report)                                                                     | §3.2                                                                    |
| 1.13 | Self-registration (pending approval) + admin approve/reject                                                                | §3.2                                                                    |
| 1.14 | User profile (name, employee ID, designation, department, manager, photo, notification prefs, theme prefs)                 | §3.5 User Profile                                                       |
| 1.15 | Roles & Permissions matrix (configurable by Super Admin)                                                                   | §3.1                                                                    |
| 1.16 | RLS for profiles, departments; middleware role-based route protection                                                      | Architecture 5.2                                                        |
| 1.17 | Audit log (login, password change, user create/edit/deactivate)                                                            | §11.2 Security                                                          |
| 1.18 | Basic email engine (Resend + React Email): account created, OTP, password changed, account locked, self-reg approve/reject | §8 Email Notification Engine (Auth subset)                              |

### 4.2 Dependencies

- P0 complete (repo, Supabase, schema v1, workshops).

### 4.3 Acceptance Criteria

- Login, logout, forgot password, first-login force change work for all roles.
- MFA enforced for Super Admin and Dept Admin.
- User CRUD respects permission matrix; RLS prevents cross-role access.
- Bulk import and self-registration + approval flow work; emails sent.
- Profile and theme/notification preferences persist.
- All auth/user actions written to audit log.

### 4.4 Risks & Mitigations

- **OTP in spam**: Plain-text OTP email, no links; whitelist domain at go-live (PRD 14).

---

## 5. Phase 2 — 3-Module Ticketing (Weeks 6–13)

**Goal**: End-to-end ticketing: scope selector, ticket lifecycle, SLA engine, unassigned queue, assignment modes, live chat, and full email notifications for ticketing.

### 5.1 Scope

| #                                 | Deliverable                                                                                                                                                                    | PRD / Feature                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| **Scope & submission**            |                                                                                                                                                                                |                                          |
| 2.1                               | Scope selector UI (IT / ERP / Not Sure) → auto-route to Help Desk, ERP, or General                                                                                             | §2.2 Scope Selection                     |
| 2.2                               | Ticket form: module, category, sub-category, subject (150), description (rich text), priority, attachments (10MB×5), optional fields                                           | §4.1 Ticket Submission                   |
| 2.3                               | Module/category configuration (Help Desk, ERP, General; categories/sub-categories per module)                                                                                  | §5 Module Category Configuration         |
| 2.4                               | Ticket number generation (e.g. HD-2026-0001) and SLA due dates from business hours                                                                                             | §4.6 SLA Configuration, Architecture 6.1 |
| **Lifecycle & statuses**          |                                                                                                                                                                                |                                          |
| 2.5                               | All ticket statuses and transitions with mandatory note                                                                                                                        | §4.2 Ticket Lifecycle                    |
| 2.6                               | SLA timer: run/pause on Pending User Response; business hours per module                                                                                                       | §4.6                                     |
| 2.7                               | Admin actions: internal note, public reply, assign/reassign, transfer, escalate, override due date, merge, link, CC watchers, attach files                                     | §4.3 Admin Ticket Actions                |
| **Unassigned queue & assignment** |                                                                                                                                                                                |                                          |
| 2.8                               | Unassigned queue (no assignee at create); badge count; Assign / Pick Up                                                                                                        | §4.7 Unassigned Ticket Queue             |
| 2.9                               | Assignment modes per module: Admin-Only, Agent Self-Pick, Round-Robin                                                                                                          | §4.7.3                                   |
| 2.10                              | Auto-escalation when ticket stays unassigned beyond threshold (P1/P2/P3/P4)                                                                                                    | §4.7.2                                   |
| 2.11                              | Bulk assignment (Module Admin)                                                                                                                                                 | §4.7.2                                   |
| **Live chat**                     |                                                                                                                                                                                |                                          |
| 2.12                              | In-ticket live chat (Supabase Realtime): broadcast and @mention; typing indicator; read receipts                                                                               | §4.8 Live Chat                           |
| 2.13                              | Chat: file sharing; history in activity log; promote message to public reply                                                                                                   | §4.8.2, 4.8.3                            |
| 2.14                              | Presence (Online/Away/Offline); chat disabled for Resolved/Closed                                                                                                              | §4.8.3, 4.8.4                            |
| **Admin tasks & activities**      |                                                                                                                                                                                |                                          |
| 2.15                              | Admin task creation (title, type, checklist, recurrence, due date, assignees)                                                                                                  | §4.4 Admin Task Creation                 |
| 2.16                              | Activity-based tasks (e.g. Onboarding, Exit, Access Request, Hardware Request) with auto sub-tasks and routing                                                                 | §4.5 Activity-Based Tasks                |
| **SLA & automation**              |                                                                                                                                                                                |                                          |
| 2.17                              | SLA engine: 80% warning email; breach → escalate + notify HOD; auto-close resolved after 48h                                                                                   | §4.6, Architecture 6.2                   |
| 2.18                              | Unassigned escalation job (configurable thresholds)                                                                                                                            | Architecture 6.2                         |
| **Ticket management extras**      |                                                                                                                                                                                |                                          |
| 2.19                              | Reopen (configurable window, reason); duplicate detection & merge; ticket split                                                                                                | §4.9.1, 4.9.2, 4.9.3                     |
| 2.20                              | Agent availability (Available/Busy/On Leave) and workload view; round-robin excludes On Leave/Busy                                                                             | §4.9.4                                   |
| 2.21                              | Ticket templates & quick-create for employees                                                                                                                                  | §4.9.5                                   |
| 2.22                              | Approval workflow on tickets (manager/HOD approval for configured categories)                                                                                                  | §4.9.6                                   |
| 2.23                              | Confidential tickets (visibility restricted; no CC; report as count only)                                                                                                      | §4.9.7                                   |
| 2.24                              | Tags and custom labels (filterable; internal only); Watch/Follow                                                                                                               | §4.9.8, 4.9.9                            |
| 2.25                              | Canned responses (placeholders: Employee Name, Ticket ID, SLA Time, etc.)                                                                                                      | §4.9.10                                  |
| **Data & security**               |                                                                                                                                                                                |                                          |
| 2.26                              | Tickets, activities, chat messages, attachments in DB; versioned SQL for new tables/RLS                                                                                        | Architecture 4.4                         |
| 2.27                              | RLS for tickets (requester, module agents, confidential)                                                                                                                       | Architecture 5.2                         |
| 2.28                              | Ticketing email triggers (created, assigned, status, reply, transferred, escalated, pending user, resolved, closed, reopened, SLA warning/breach, CSAT negative, daily digest) | §8 Email Notification Engine (Ticketing) |
| 2.29                              | CSAT survey on resolution (1–5 star + comment); trigger on close                                                                                                               | §4.2, §8                                 |

### 5.2 Dependencies

- P1 complete (auth, RBAC, profiles, email engine stub).

### 5.3 Acceptance Criteria

- Employee can raise ticket via scope selector; ticket lands in correct module queue with correct SLA.
- Unassigned queue works; assignment modes (admin-only, self-pick, round-robin) configurable and behave as specified.
- Live chat works in ticket with broadcast/@mention, persistence, and promote-to-reply.
- All ticket status transitions and admin actions supported; SLA timer and breach handling work.
- All ticketing email triggers fire with correct recipients and content.
- RLS restricts ticket visibility by role and module; confidential tickets hidden appropriately.

### 5.4 Risks & Mitigations

- **Wrong module selection**: Clear scope tiles and General catch-all; Super Admin re-routes within 4h (PRD 14).

---

## 5A. Phase 2A — Notifications, SLA Aging & Admin Workflow (Weeks 13–14)

**Goal**: Layer real-time notifications, ticket-age / SLA visual alerting, and the requester approve-close / re-open admin workflow on top of the core ticketing engine built in P2.

### 5A.1 Scope

| #                       | Deliverable                                                                                                                                    | PRD / Feature    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **Database**            |                                                                                                                                                |                  |
| 2A.1                    | `ticket_notifications` table: `id`, `user_id`, `ticket_id`, `message`, `is_read` (boolean), `created_at`; RLS (users see own only)             | §4.2, §8         |
| 2A.2                    | `ticket_logs` view/alias over `ticket_activity_log` — every status change records `actor_id`, `old_value`, `new_value`, `created_at`           | §4.2 Audit       |
| **Assignment Logic**    |                                                                                                                                                |                  |
| 2A.3                    | DB trigger `trg_ticket_assignment_notify`: on `assigned_to_id` change → auto-set status to `assigned`; insert notification row for assignee    | §4.2, §4.7       |
| 2A.4                    | Simulated email trigger function `simulate_assignment_email(ticket_id)` — logs intent to `ticket_activity_log` (real send via Resend in P2)    | §8 Email         |
| **Notification Module** |                                                                                                                                                |                  |
| 2A.5                    | Server Action `getUnreadNotifications(userId)` — returns all unread rows ordered by `created_at DESC`                                          | §8               |
| 2A.6                    | Server Action `markNotificationsRead(ids[])` — bulk mark read                                                                                  | §8               |
| 2A.7                    | Notification bell in dashboard header: badge count, dropdown list, mark-all-read                                                               | §8 UI            |
| **SLA Time Aging**      |                                                                                                                                                |                  |
| 2A.8                    | DB function `ticket_age_display(ticket_id)` — returns `{ display_text, total_minutes, is_overdue, is_resolved }`; stops clock at `resolved_at` | §4.6 SLA         |
| 2A.9                    | Client-side `useTicketAge(createdAt, resolvedAt, status)` hook — formats `X Days, Y Hours, Z Minutes`; `setInterval` 60s refresh               | §4.6 UI          |
| 2A.10                   | **Visual alerts in Ticket List**: Pending > 48 h → `Overdue` red badge; < 24 h → `New` green badge; resolved → show resolution time            | §4.6 UI          |
| **Admin Workflow**      |                                                                                                                                                |                  |
| 2A.11                   | Admin Server Action `resolveTicket(ticketId)` — sets `status = resolved`, `resolved_at = now()`, inserts notification to requester             | §4.2             |
| 2A.12                   | Requester UI on resolved ticket: **"Approve Closing"** (→ `closed`) and **"Re-open"** (→ `in_progress`, clears `resolved_at`) buttons          | §4.2, §4.9.1     |
| 2A.13                   | Notifications for requester approve/re-open; activity log entry for each action                                                                | §8               |
| **Security**            |                                                                                                                                                |                  |
| 2A.14                   | RLS on `ticket_notifications`; only `user_id = auth.uid()` can read/update own rows                                                            | Architecture 5.2 |
| 2A.15                   | All server actions validate role before mutation (Zod + auth check)                                                                            | Architecture 5.1 |

### 5A.2 Dependencies

- P2 complete (tickets, `ticket_activity_log`, assignment, status machine).
- P1 (auth, profiles, Resend email engine stub).

### 5A.3 Acceptance Criteria

- Assigning a ticket auto-sets status to `Assigned`; assignee sees notification in bell (badge +1).
- Ticket List shows `Time Pending` column refreshing every 60 s; overdue/new colour badges apply correctly.
- Resolved/Closed tickets show static Resolution Time; clock does not advance.
- Admin can mark ticket Resolved from the detail page; requester notification appears.
- Requester can Approve Closing (→ Closed) or Re-open (→ In Progress) from their ticket detail view.
- All mutations write to `ticket_activity_log`; unread notification count correct after mark-read.

### 5A.4 Risks & Mitigations

- **Clock drift on client**: `setInterval` 60 s is acceptable for display; source-of-truth is DB `created_at`.
- **Notification flood**: limit to one notification per event type per ticket × user (upsert with conflict ignore). (Weeks 14–15)

**Goal**: Meetings linked to tickets, .ics invitations, team calendar, and meeting outcome logging.

### 6.1 Scope

| #   | Deliverable                                                                                          | PRD / Feature              |
| --- | ---------------------------------------------------------------------------------------------------- | -------------------------- |
| 3.1 | Schedule meeting from ticket (title, type, date/time, duration, participants, link/location, agenda) | §6.1 Schedule a Meeting    |
| 3.2 | ICS generation and email with .ics attachment (Resend)                                               | §6.1, Architecture 6.4     |
| 3.3 | Accept/Decline from email; record RSVP in activity                                                   | §6.1                       |
| 3.4 | Ticket status → Scheduled; reminder 30 min before                                                    | §6.1, §8                   |
| 3.5 | Meeting outcome note (completed/cancelled); reschedule/cancel with updated/cancel .ics               | §6.1                       |
| 3.6 | Team calendar (Help Desk + ERP): day/week/month; filter by agent; open ticket from entry             | §6.2 Team Meeting Calendar |
| 3.7 | Email triggers: meeting scheduled, reminder, rescheduled, cancelled                                  | §8                         |

### 6.2 Dependencies

- P2 complete (tickets, activities, email engine).

### 6.3 Acceptance Criteria

- Agent can schedule meeting from ticket; all participants receive .ics and can accept/decline.
- Reminder and reschedule/cancel emails sent; calendar view shows meetings and links to tickets.
- Meeting outcome stored in ticket activity.

---

## 7. Phase 4 — IT Asset & Stock Management (Weeks 16–22)

**Goal**: Full asset lifecycle with mandatory photos, stock ledger, handover emails with inline photos, acknowledgement, and return/damage/write-off flows.

### 7.1 Scope

| #                          | Deliverable                                                                                                                              | PRD / Feature                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **Asset master & types**   |                                                                                                                                          |                                  |
| 4.1                        | Asset sub-types and mandatory fields (per PRD 7.1)                                                                                       | §7.1 IT Asset Types              |
| 4.2                        | Asset register (asset code, sub-type, brand, model, serial, status, condition, warranty, etc.)                                           | §7.2, Architecture 4.5           |
| **Stock movements**        |                                                                                                                                          |                                  |
| 4.3                        | Opening stock, Purchase inward, Handover, Return, Damaged, Write-off, Adjustment — all with mandatory photo (form blocked without photo) | §7.2 Stock Movement Types        |
| 4.4                        | Handover: employee lookup, condition, note, expected return date; assignment email with inline photos and Acknowledge button             | §7.4 Handover to Employee        |
| 4.5                        | Acknowledgement tracking (48h reminder; 72h escalation to manager); one-click acknowledge from email                                     | §7.4, §8                         |
| 4.6                        | Return: condition at return (Good/Fair/Damaged); mandatory photo; Good/Fair → In Stock; Damaged → Damaged pool                           | §7.5 Return, Damaged & Write-Off |
| 4.7                        | Damaged: damage record, photos, Send for Repair or Write-off; Write-off with HOD approval (one-click email)                              | §7.5                             |
| 4.8                        | Adjustment with dual approval (Asset Manager + Super Admin); evidence photo                                                              | §7.2                             |
| **Storage & immutability** |                                                                                                                                          |                                  |
| 4.9                        | Supabase Storage: asset-photos bucket immutable (no delete/update); ticket-attachments normal CRUD                                       | Architecture 6.3                 |
| **Ledger & dashboard**     |                                                                                                                                          |                                  |
| 4.10                       | Live stock ledger (opening, purchased, handed over, returned, damaged, assigned, under repair, available)                                | §7.3 Live Stock Ledger           |
| 4.11                       | Low stock threshold per sub-type; alert email and dashboard highlight                                                                    | §7.3, §7.7                       |
| 4.12                       | Asset dashboard: stock cards, movement chart, unacknowledged handovers, pending write-off, warranty expiry, under repair                 | §7.7 Asset & Stock Dashboard     |
| **Employee view**          |                                                                                                                                          |                                  |
| 4.13                       | My Assets: current assignments, photos, condition, return date; overdue alerts; pending ack; history; Raise Repair Ticket (pre-fill)     | §7.6 My Assets                   |
| **Email & DB**             |                                                                                                                                          |                                  |
| 4.14                       | Asset email triggers (handover, ack reminder/escalation, return, write-off approval/approved, low stock, warranty 30d/7d)                | §8 (IT Asset & Stock)            |
| 4.15                       | Versioned SQL for assets, stock_movements, asset_photos, acknowledgements; RLS (e.g. asset_photos no delete/update)                      | Architecture 4.5, 5.2            |

### 7.2 Dependencies

- P2 complete (tickets for “Raise Repair Ticket”); P1 (users for employee lookup).

### 7.3 Acceptance Criteria

- No stock movement record without at least one photo; handover email contains inline photos and acknowledge link.
- Ledger and dashboard numbers match; low stock and warranty alerts fire.
- Write-off requires HOD approval; written-off assets remain visible in archive.
- My Assets shows current and history; Raise Repair Ticket pre-fills Help Desk form.

### 7.4 Risks & Mitigations

- **Photo upload skipped**: Hard-enforce in form and server validation (PRD 14).
- **Opening stock data quality**: Physical audit and bulk import template in P0; IS sign-off (PRD 14).

---

## 8. Phase 5 — Reporting & Analytics (Weeks 23–24)

**Goal**: Operational and leadership reports, exports, executive dashboard, and CSAT analytics.

### 8.1 Scope

| #   | Deliverable                                                                                                                                                                                | PRD / Feature                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| 5.1 | Module summary dashboard (open, in-progress, SLA-breached by module)                                                                                                                       | §9.1 Ticketing Reports        |
| 5.2 | Ticket volume by module; SLA compliance %; agent performance; module performance                                                                                                           | §9.1                          |
| 5.3 | Overdue tickets report; meeting & call log report; category heatmap; activity task report                                                                                                  | §9.1                          |
| 5.4 | Reopened tickets report; CSAT report (scores + comments)                                                                                                                                   | §9.1                          |
| 5.5 | Audit trail report (immutable; 24-month retention)                                                                                                                                         | §9.1                          |
| 5.6 | Stock ledger; purchase inward; handover; return; damaged & write-off; chain of custody; unacknowledged handovers; under repair; warranty expiry; employee asset summary; IT asset register | §9.2 IT Asset & Stock Reports |
| 5.7 | Executive dashboard: module tiles, SLA gauge, top 5 categories, asset overview, trend lines, overdue escalations, drill-down                                                               | §9.3 Executive Dashboard      |
| 5.8 | Export: PDF and Excel where specified; scheduled email reports (e.g. daily digest)                                                                                                         | §9.1, §4.6                    |

### 8.2 Dependencies

- P2 (ticketing), P4 (assets), P1 (users) for full report set.

### 8.3 Acceptance Criteria

- All listed reports available to correct roles; data consistent with source tables.
- Executive dashboard loads in < 2s (P95); exports generate without error.
- Audit trail is immutable and queryable for compliance.

---

## 9. Phase 6 — Platform Settings & Branding (Weeks 25–26)

**Goal**: Company branding, theme (admin + user), custom fields, email template editor, and custom module builder foundation.

### 9.1 Scope

| #   | Deliverable                                                                                                                                               | PRD / Feature                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 6.1 | Company branding: logo, name, favicon, login banner/tagline, email banner/footer, PDF header, module icons                                                | §10.1 Company Branding         |
| 6.2 | Theme (admin): primary/secondary, font, module colors, default mode, branding lock                                                                        | §10.2 Theme — Admin Controls   |
| 6.3 | Theme (user): light/dark/system, accent, sidebar, density, font size, notification style                                                                  | §10.3 Theme — User Preferences |
| 6.4 | Custom fields: add to Ticketing, Assets, Activities (types per PRD); required/optional/admin-only; conditional display; order                             | §10.4 Custom Fields            |
| 6.5 | Email template editor (variables, preview, test send); per-module branding option                                                                         | §10.5 Email Template Editor    |
| 6.6 | Custom module builder (Phase 2-ready): define module name/icon/type, form, categories, routing (documentation and schema support; full UI can be Phase 2) | §10.6 Custom Module Builder    |

### 9.2 Dependencies

- P1–P5 for full context (tickets, assets, emails).

### 9.3 Acceptance Criteria

- Logo and theme apply on login, header, emails, and exports.
- User theme preferences persist; custom fields appear on forms and in exports.
- Email templates editable and test-send works; custom module builder documented/schema-ready.

---

## 10. Phase 7 — Security, Infra & Hardening (Weeks 27–28)

**Goal**: Production-ready security, RLS audit, MFA enforcement, VAPT, and operational readiness.

### 10.1 Scope

| #   | Deliverable                                                                                   | PRD / Architecture               |
| --- | --------------------------------------------------------------------------------------------- | -------------------------------- |
| 7.1 | Full RLS audit: every table has correct policies; confidential and module boundaries verified | §11.2 Security, Architecture 5.2 |
| 7.2 | MFA enforced for Super Admin and Dept Admin (middleware + auth checks)                        | §3.2, Architecture 5.1           |
| 7.3 | OWASP Top 10 checklist (access control, crypto, injection, auth, logging, etc.)               | Architecture 7.2                 |
| 7.4 | VAPT (external recommended); remediate critical/high findings                                 | §11.2, PRD 14                    |
| 7.5 | Sentry (or equivalent) for frontend and Edge Functions; alerting on errors                    | Architecture 2.1                 |
| 7.6 | Vercel production config (env, no debug headers); Supabase Pro PITR/backups                   | §11.1, Architecture 10.1         |
| 7.7 | DR runbook: RTO < 4h, RPO < 1h; restore test                                                  | §11.3                            |
| 7.8 | Load test (e.g. k6) for 500+ concurrent users; tune if needed                                 | §11.3, Architecture 11.1         |

### 10.2 Dependencies

- P1–P6 feature-complete.

### 10.3 Acceptance Criteria

- RLS covers all tables; no bypass paths.
- VAPT signed off; critical/high closed.
- Monitoring and runbooks in place; load test meets targets (page load < 2s P95, 500+ users).

---

## 11. Phase 8 — UAT & Training (Weeks 29–30)

**Goal**: End-to-end validation by business users and training for go-live.

### 11.1 Scope

| #   | Deliverable             | Description                                                                                               |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------------- |
| 8.1 | UAT plan                | Test cases for all roles and critical flows (login, ticket lifecycle, asset handover, meetings, reports). |
| 8.2 | UAT execution           | Cross-module and cross-role; defect triage and fix.                                                       |
| 8.3 | Training: Module Admins | Per-department: queue, assignment, SLA, categories, settings.                                             |
| 8.4 | Training: End users     | Portal: new ticket, scope selector, My Tickets, My Assets.                                                |
| 8.5 | Knowledge base          | Internal KB for common issues and how to use EIRMS (links from portal).                                   |
| 8.6 | Go-live checklist       | Sign-off: security, backup, DNS, email domain, support contacts.                                          |

### 11.2 Dependencies

- P7 complete (security and infra).

### 11.3 Acceptance Criteria

- UAT passed for all critical paths; no P0/P1 open.
- Training delivered; KB and go-live checklist signed.

---

## 12. Phase 9 — Go-Live & Hypercare (Weeks 31–33)

**Goal**: Phased production rollout and stabilisation.

### 12.1 Scope

| #   | Deliverable        | Description                                                                     |
| --- | ------------------ | ------------------------------------------------------------------------------- |
| 9.1 | Phased go-live     | Auth + Ticketing first → then Assets → then Reports/Settings (or as agreed).    |
| 9.2 | Hypercare          | Dedicated support window; quick defect fix and user support.                    |
| 9.3 | Post-launch review | Metrics (adoption, SLA, CSAT); lessons learned; Phase 2 backlog prioritisation. |

### 12.2 Dependencies

- P8 complete (UAT and training).

### 12.3 Acceptance Criteria

- Production live per phase; no critical outages.
- Post-launch review documented; Phase 2 backlog updated.

---

## 13. Feature Checklist (All Phases)

Use this as a quick map from PRD section to implementation phase.

| PRD Section                                                                     | Phase                                                 |
| ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| §1–2 Module architecture, scope selector                                        | P0 (design), P2 (build)                               |
| §3 User auth, CRUD, login, OTP, MFA, password policy, profile                   | P1                                                    |
| §4 Ticketing (lifecycle, queue, chat, SLA, tasks, activities, extras)           | P2                                                    |
| §4A Notifications, SLA aging, approve-close, reopen                             | P2A                                                   |
| §5 Module category configuration                                                | P2                                                    |
| §6 Meeting scheduling & team calendar                                           | P3                                                    |
| §7 IT Asset & Stock (lifecycle, ledger, handover, return, write-off, My Assets) | P4                                                    |
| §8 Email notification engine                                                    | P1 (auth), P2 (ticketing), P3 (meetings), P4 (assets) |
| §9 Reporting & analytics                                                        | P5                                                    |
| §10 Platform settings & branding                                                | P6                                                    |
| §11 Cloud & security                                                            | P7                                                    |
| §12 Phase 2 (deferred)                                                          | Backlog                                               |

---

## 14. Best Practices Summary

- **Database**: All schema/RLS/functions in `db/vNNN_*.sql`; run manually in order; no Supabase CLI migrations.
- **Security**: RLS on every table; Zod on every Server Action input; no raw SQL with user input.
- **Audit**: Log all material actions to `audit_log`; retain 24 months.
- **Email**: Single engine (Resend + React Email); all triggers documented; test send before go-live.
- **Performance**: Indexes per Architecture 11.2; RSC for lists/dashboards; Realtime only where needed.
- **Change control**: PRD/backlog for new scope; no ad-hoc feature creep during Phase 1.

---

## 15. Document Control

| Version | Date       | Author     | Summary                                                                                                                                                  |
| ------- | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | March 2026 | EIRMS Team | Initial phase-wise implementation plan; aligned to PRD v3 and Architecture Plan.                                                                         |
| 1.1     | March 2026 | EIRMS Team | Added Phase 2A: Notifications, SLA Aging & Admin Workflow (ticket assign trigger, notification bell, time-pending column, approve-close / re-open flow). |

---

_This plan is the single source of truth for Phase 1 implementation order and scope. For detailed requirements, see EIRMS_PRD_v3_Updated.md; for technical design, see EIRMS_Architecture_Plan.md._
