# EIRMS — Technical Architecture Plan
**Next.js 15 + Supabase Stack**

EIRMS
Enterprise Issue & Request Management System
Technical Architecture Plan
Next.js 15 + Supabase Stack
Document Type
Technical Architecture Plan
PRD Version
v3 — March 2026
Tech Stack
Next.js 15 + Supabase (Phase 1)
Phase 1 Timeline
33 Weeks (~8 months)
Status
Draft — For Development
Prepared For
EIRMS Development Team

## 01  Executive Summary & Architecture Overview
EIRMS is a unified internal portal for raising, tracking, and resolving all employee issues and requests across three modules — Help Desk, ERP, and General. This document defines the complete technical architecture for Phase 1 using Next.js 15 and Supabase as the core stack.
The architecture is designed to be deployed on Vercel (frontend) with Supabase providing the database, auth, real-time, storage, and edge functions — giving a fully managed, scalable foundation for 500+ concurrent users with minimal operational overhead.

### 1.1  Scope of Phase 1
Core Domain
Key Features
Data Volume Estimate
User Auth & RBAC
Login, OTP, MFA, CRUD, Bulk Import
~500–2,000 users
3-Module Ticketing
Lifecycle, SLA, Assign, Escalate, Chat
~200–500 tickets/day
IT Asset & Stock Mgmt
Full lifecycle, photos, ledger
~2,000–10,000 assets
Meeting Scheduler
ICS emails, calendar, outcomes
~20–50 meetings/week
Notification Engine
Email, in-app, real-time chat
~5,000–20,000 emails/month
Reporting & Analytics
Dashboards, exports, CSAT
Aggregated from above
Platform Settings
Branding, custom fields, templates
Configuration data

### 1.2  Why Next.js + Supabase for EIRMS
Next.js 15 Advantage
Supabase Advantage
App Router with Server Components — fast dashboards
Postgres + Row Level Security — native multi-role isolation
Server Actions — secure form submissions without API boilerplate
Realtime subscriptions — live chat, ticket updates, queue counts
Built-in file-based routing — clean module separation
Supabase Auth — OTP, MFA, session management built-in
Edge Middleware — tenant/role checks before page render
Storage with RLS — asset photos with per-role access
Vercel deployment — zero-config, global CDN, preview URLs
Edge Functions — SLA monitoring, email triggers, cron jobs
Turbopack dev server — fast iteration cycles
Supabase Studio — admin DB visibility during development

## 02  Full Technology Stack

### 2.1  Layer-by-Layer Stack
Layer
Technology
Purpose / Notes
UI Framework
Next.js 15 (App Router)
SSR + RSC for dashboards, Client Components for live chat
Language
TypeScript 5
End-to-end type safety across all layers
Styling
Tailwind CSS v4 + Shadcn/ui
Consistent component library; customizable brand tokens
State (Server)
TanStack Query v5
Caching, background refetch, optimistic updates
State (Client)
Zustand
Role-based UI state, notification tray, sidebar prefs
Forms
React Hook Form + Zod
All ticket/asset forms with schema validation
Rich Text Editor
Tiptap
Ticket description, email templates, canned responses
Database
Supabase (PostgreSQL 16)
Primary data store — all entities
Auth
Supabase Auth
Email+password, OTP (email), MFA (TOTP), sessions
Row Security
Supabase RLS Policies
Module/role isolation enforced at DB level
Realtime
Supabase Realtime
Live chat messages, ticket status, queue badge counts
File Storage
Supabase Storage
Asset photos (immutable), attachments, logos
Server Logic
Next.js Server Actions
Ticket CRUD, asset movements, user management
Background Jobs
Supabase Edge Functions + pg_cron
SLA checks, email dispatch, daily digests, auto-close
Email
Resend + React Email
All 40+ email triggers with branded HTML templates
Search
Supabase Full-Text Search (pg_trgm)
Tickets, assets, users — upgrade to Typesense Phase 2
ORM / Query
Drizzle ORM
Type-safe queries; migrations tracked in git
API Validation
Zod
All Server Action inputs, API route payloads
Error Tracking
Sentry
Frontend + Server error capture from day one
Analytics
PostHog
Feature usage, onboarding funnels, CSAT tracking
Deployment
Vercel
Frontend; preview deployments per PR
Database Hosting
Supabase Cloud (Pro Plan)
Managed Postgres, auto-backups, PITR
CDN
Vercel Edge Network
Static assets, Next.js ISR pages, image optimization
Monorepo
Turborepo + pnpm
apps/web + apps/email + packages/db + packages/ui

## 03  System Architecture

### 3.1  High-Level Architecture Diagram
Architecture Overview (Text Diagram)
Browser/Device  →  Vercel Edge (Middleware: Auth Check + Role Gate)  →  Next.js App Router
                                                                              ↓
                                    Server Components (dashboards, reports, ticket lists)
                                    Client Components (live chat, realtime queue, editor)
                                    Server Actions (mutations: create ticket, move asset)
                                              ↓                        ↓
                               Supabase Postgres ←→ Supabase Realtime (WebSocket)
                               (RLS enforced)           (chat, status, badges)
                                    ↓              ↓                ↓
                              Supabase Auth   Supabase Storage  Edge Functions
                              (sessions,MFA)  (asset photos)    (SLA cron, emails)
                                                                      ↓
                                                              Resend (Email API)

### 3.2  Application Layer Structure
The Next.js app uses the App Router with a clear route group separation per role:
apps/web/src/app/
(auth)/                         # Login, forgot password, first-login
(employee)/                     # End-user portal — tickets, assets, profile
dashboard/
tickets/
[ticketId]/                 # Ticket detail + live chat sidebar
my-assets/
new-ticket/                   # Scope selector → form
(agent)/                        # Agent workspace
queue/                        # Module queue + unassigned queue
tickets/[ticketId]/
calendar/                     # Team meeting calendar
(admin)/                        # Module Admin + Super Admin
users/
modules/[moduleId]/
assets/
reports/
settings/
api/                            # Minimal API routes (webhooks, health)
middleware.ts                     # Supabase session + role-based route guard

### 3.3  Monorepo Package Structure
eirms/                            # Turborepo root
apps/
web/                          # Next.js 15 application
email/                        # React Email templates (all 40+ triggers)
packages/
db/                           # Drizzle schema, migrations, seed
ui/                           # Shared Shadcn/ui component library
types/                        # Shared TypeScript types & Zod schemas
config/                       # eslint, tsconfig, tailwind presets
supabase/
migrations/                   # SQL migration files
functions/                    # Edge Functions (SLA, email, cron)
seed.sql                      # Development seed data

## 04  Database Schema Design

### 4.1  Core Entity Groups
All tables include created_at, updated_at timestamps. Soft-delete (deleted_at) on critical entities. All foreign keys use UUID. RLS policies on every table.

### 4.2  Users & Auth Domain
-- Auth is handled by Supabase Auth (auth.users table)
-- We extend with a profiles table linked 1:1
profiles (extends auth.users)
id              uuid PK  -- matches auth.users.id
employee_id     text UNIQUE NOT NULL
full_name       text NOT NULL
designation     text
department_id   uuid FK → departments
manager_id      uuid FK → profiles (self-referential)
mobile          text
personal_email  text
avatar_url      text
status          enum('active','inactive','pending_approval','locked')
role            enum('super_admin','dept_admin','module_agent','end_user')
theme_prefs     jsonb    -- {mode, accent, density, fontSize, sidebar}
notification_prefs jsonb -- {ticket_assigned: 'email'|'app'|'both', ...}
last_login_at   timestamptz
password_changed_at timestamptz
force_password_change boolean DEFAULT true
failed_login_attempts int DEFAULT 0
locked_until    timestamptz
created_by      uuid FK → profiles
departments
id              uuid PK
name            text NOT NULL
code            text UNIQUE
head_id         uuid FK → profiles
-- Password history for last-5 policy (stored as bcrypt hashes)
password_history
id              uuid PK
user_id         uuid FK → profiles
password_hash   text NOT NULL
created_at      timestamptz

### 4.3  Module & Configuration Domain
modules
id              uuid PK
name            text NOT NULL  -- 'Help Desk', 'ERP', 'General'
slug            text UNIQUE    -- 'help-desk', 'erp', 'general'
icon            text
color           text           -- hex color for UI tagging
assignment_mode enum('admin_only','self_pick','round_robin')
unassigned_alert_hours int DEFAULT 2
is_active       boolean DEFAULT true
settings        jsonb          -- business hours, auto-close days, etc.
module_agents                    -- which agents belong to which module
module_id       uuid FK → modules
user_id         uuid FK → profiles
is_admin        boolean DEFAULT false
is_active       boolean DEFAULT true
PRIMARY KEY (module_id, user_id)
categories
id              uuid PK
module_id       uuid FK → modules
name            text NOT NULL
is_active       boolean DEFAULT true
sort_order      int
sub_categories
id              uuid PK
category_id     uuid FK → categories
name            text NOT NULL
is_active       boolean DEFAULT true
sla_policies
id              uuid PK
module_id       uuid FK → modules
priority        enum('critical','high','medium','low')
response_minutes  int          -- P1=15, P2=60, P3=240, P4=480
resolution_minutes int         -- P1=240, P2=480, P3=4320, P4=14400
custom_fields
id              uuid PK
entity_type     enum('ticket','asset','activity')
module_id       uuid FK → modules  -- null = org-wide
label           text NOT NULL
field_type      enum('text','textarea','number','date','daterange','dropdown','multiselect','checkbox','file','url','lookup')
is_required     boolean DEFAULT false
is_admin_only   boolean DEFAULT false
options         jsonb          -- for dropdown/multiselect
depends_on      jsonb          -- conditional display rule
sort_order      int

### 4.4  Ticketing Domain
tickets
id              uuid PK
ticket_number   text UNIQUE   -- 'HD-2026-0001', 'ERP-2026-0042'
module_id       uuid FK → modules
category_id     uuid FK → categories
sub_category_id uuid FK → sub_categories
subject         text NOT NULL  -- max 150 chars
description     text NOT NULL  -- rich text (stored as HTML/markdown)
priority        enum('critical','high','medium','low')
status          enum('new','assigned','in_progress','pending_user','pending_dept','pending_third_party','scheduled','escalated','resolved','closed','cancelled')
requester_id    uuid FK → profiles
assigned_to     uuid FK → profiles  -- nullable for unassigned
affected_person_id uuid FK → profiles
related_asset_id   uuid FK → assets
related_ticket_id  uuid FK → tickets (self)
parent_ticket_id   uuid FK → tickets (for splits)
is_confidential    boolean DEFAULT false
is_split           boolean DEFAULT false
preferred_resolution_date date
resolved_at     timestamptz
closed_at       timestamptz
sla_response_due_at   timestamptz
sla_resolution_due_at timestamptz
sla_paused_at   timestamptz   -- when status = pending_user
sla_pause_duration int DEFAULT 0  -- accumulated pause seconds
first_response_at    timestamptz
reopen_count    int DEFAULT 0
csat_score      int           -- 1-5
csat_comment    text
csat_sent_at    timestamptz
custom_fields   jsonb         -- {field_id: value}
tags            text[]
cc_user_ids     uuid[]
department_id   uuid FK → departments
cost_centre     text
created_at      timestamptz DEFAULT now()
updated_at      timestamptz
ticket_activities                -- immutable audit log of all events
id              uuid PK
ticket_id       uuid FK → tickets
actor_id        uuid FK → profiles
action_type     enum('created','status_changed','assigned','reassigned','transferred','escalated','reply_public','note_internal','file_attached','meeting_scheduled','merged','split','reopened','csat_submitted','field_updated')
old_value       jsonb
new_value       jsonb
note            text
is_internal     boolean DEFAULT false
created_at      timestamptz DEFAULT now()
ticket_chat_messages             -- live chat per ticket
id              uuid PK
ticket_id       uuid FK → tickets
sender_id       uuid FK → profiles
target_user_id  uuid FK → profiles  -- null = broadcast
message         text NOT NULL
is_promoted     boolean DEFAULT false  -- promoted to public reply
created_at      timestamptz DEFAULT now()
read_by         jsonb          -- {user_id: timestamp}
ticket_attachments
id              uuid PK
ticket_id       uuid FK → tickets
uploaded_by     uuid FK → profiles
storage_path    text NOT NULL  -- Supabase Storage path
file_name       text
file_size       int
source          enum('ticket_form','reply','chat')
created_at      timestamptz
canned_responses
id              uuid PK
module_id       uuid FK → modules  -- null = personal
owner_id        uuid FK → profiles
title           text NOT NULL
body            text NOT NULL  -- supports {Employee Name} placeholders
is_shared       boolean DEFAULT false

### 4.5  IT Asset Domain
asset_sub_types
id              uuid PK
name            text NOT NULL  -- 'Laptop / Desktop', 'Mobile Phone', etc.
required_fields jsonb          -- ['serial_no','brand','model','warranty_expiry',...]
low_stock_threshold int DEFAULT 5
assets                           -- master asset register
id              uuid PK
asset_code      text UNIQUE    -- auto-generated: 'IT-LAP-0001'
sub_type_id     uuid FK → asset_sub_types
brand           text
model           text
serial_number   text
status          enum('in_stock','assigned','under_repair','damaged','written_off')
condition       enum('new','good','fair','damaged')
purchase_date   date
warranty_expiry date
vendor          text
invoice_number  text
unit_cost       numeric(12,2)
specifications  jsonb          -- RAM, storage, OS, IMEI, etc.
current_holder_id uuid FK → profiles  -- null if in stock
is_written_off  boolean DEFAULT false
written_off_at  timestamptz
custom_fields   jsonb
notes           text
stock_movements                  -- every movement creates an immutable record
id              uuid PK
asset_id        uuid FK → assets
movement_type   enum('opening_stock','purchase_inward','handover','return','damaged','write_off','adjustment')
direction       enum('in','out')
quantity        int DEFAULT 1
from_user_id    uuid FK → profiles  -- for returns/handovers
to_user_id      uuid FK → profiles  -- for handovers
condition_before enum('new','good','fair','damaged')
condition_after  enum('new','good','fair','damaged')
notes           text
return_reason   enum('employee_exit','end_of_loan','upgrade','voluntary','other')
vendor_invoice  text
total_cost      numeric(12,2)
performed_by    uuid FK → profiles
approved_by     uuid FK → profiles  -- for write-offs
expected_return_date date
created_at      timestamptz DEFAULT now()
asset_photos                     -- immutable, linked to movement
id              uuid PK
movement_id     uuid FK → stock_movements
asset_id        uuid FK → assets
storage_path    text NOT NULL  -- Supabase Storage (immutable bucket)
uploaded_by     uuid FK → profiles
created_at      timestamptz DEFAULT now()
asset_acknowledgements
id              uuid PK
movement_id     uuid FK → stock_movements
employee_id     uuid FK → profiles
acknowledged_at timestamptz   -- null = pending
token           text UNIQUE   -- for one-click email link
expires_at      timestamptz

### 4.6  Meeting & Notification Domain
meetings
id              uuid PK
ticket_id       uuid FK → tickets
title           text NOT NULL
meeting_type    enum('online','physical','phone')
scheduled_at    timestamptz NOT NULL
duration_minutes int
meeting_url     text
location        text
agenda          text
outcome_notes   text
status          enum('scheduled','completed','cancelled','rescheduled')
organiser_id    uuid FK → profiles
ics_uid         text UNIQUE  -- for calendar update/cancel
meeting_participants
meeting_id      uuid FK → meetings
user_id         uuid FK → profiles
rsvp_status     enum('pending','accepted','declined')
PRIMARY KEY (meeting_id, user_id)
notification_log                 -- audit trail of all notifications sent
id              uuid PK
recipient_id    uuid FK → profiles
channel         enum('email','in_app','push')
event_type      text           -- 'ticket.created', 'asset.handed_over', etc.
entity_id       uuid           -- ticket_id, asset_id, meeting_id
subject         text
sent_at         timestamptz
status          enum('sent','failed','bounced')
audit_log                        -- immutable system-wide audit (24 months)
id              uuid PK
user_id         uuid FK → profiles
action          text NOT NULL
entity_type     text
entity_id       uuid
ip_address      text
user_agent      text
changes         jsonb
created_at      timestamptz DEFAULT now()

## 05  Supabase Architecture — Auth, RLS & Realtime

### 5.1  Supabase Auth Configuration
Auth Feature
EIRMS Configuration
Email + Password
Primary login method; custom password policy via DB trigger (length, complexity, common-passwords list)
OTP (Email)
Forgot password flow — Supabase Auth OTP with 15-min expiry; 3 attempts before lockout
MFA (TOTP)
Mandatory for super_admin and dept_admin roles; enforced via middleware after session check
Session Duration
30-day refresh token for 'Remember Me' (disabled for admins); 30-min idle timeout
Force Password Change
auth.users metadata flag checked on every login; middleware redirects to /change-password
Account Lockout
5 failed attempts trigger locked_until = now() + 30min (custom DB trigger + middleware check)
Concurrent Sessions
Max 2 sessions per user — custom enforcement via sessions table + middleware
New User Flow
Admin creates user in Supabase Auth → system emails temp password → force_change on first login

### 5.2  Row Level Security (RLS) Policy Strategy
RLS is the core security layer. Every table has RLS enabled. Policies use the authenticated user's role and module memberships.
-- Example: Tickets visible only within user's scope
CREATE POLICY tickets_select ON tickets FOR SELECT
USING (
-- Requester sees own tickets
requester_id = auth.uid()
-- Agents/Admins see tickets in their modules
OR EXISTS (
SELECT 1 FROM module_agents ma
WHERE ma.user_id = auth.uid()
AND ma.module_id = tickets.module_id
)
-- Super Admin sees everything
OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
);
-- Confidential ticket restriction
CREATE POLICY tickets_confidential ON tickets FOR SELECT
USING (
NOT is_confidential
OR requester_id = auth.uid()
OR assigned_to = auth.uid()
OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin','dept_admin')
);
-- Asset photos: immutable — no UPDATE or DELETE allowed
CREATE POLICY asset_photos_no_delete ON asset_photos FOR DELETE
USING (false);  -- Nobody can delete
CREATE POLICY asset_photos_no_update ON asset_photos FOR UPDATE
USING (false);  -- Nobody can update

### 5.3  Supabase Realtime — Channels & Use Cases
Realtime Channel
Subscribes To
Powers
ticket:{ticketId}
ticket_chat_messages INSERT
Live chat messages, typing indicators, read receipts
ticket:{ticketId}
ticket_activities INSERT
Real-time status changes, reply notifications
queue:{moduleId}
tickets INSERT/UPDATE
Unassigned queue badge count, new ticket alerts
user:{userId}
notification_log INSERT
In-app notification tray pop-ups
presence:{ticketId}
Presence tracking
Online/Away/Offline status dots in chat
asset-dashboard
stock_movements INSERT
Live stock ledger updates in admin dashboard

## 06  Key Feature Architecture

### 6.1  Scope Selector → Ticket Routing (Server Action Flow)
// app/(employee)/new-ticket/actions.ts
export async function createTicket(formData: CreateTicketSchema) {
const supabase = createServerClient()
const { data: { user } } = await supabase.auth.getUser()
// Determine module from scope selection
const moduleId = await getModuleForScope(formData.scope)
// Calculate SLA deadlines
const sla = await getSLAPolicy(moduleId, formData.priority)
const businessHours = await getBusinessHours(moduleId)
const responseDue = calculateSLADeadline(sla.response_minutes, businessHours)
const resolutionDue = calculateSLADeadline(sla.resolution_minutes, businessHours)
// Generate ticket number
const ticketNumber = await generateTicketNumber(moduleId)
// Insert ticket (RLS ensures requester_id = auth.uid())
const { data: ticket } = await supabase
.from('tickets')
.insert({ ...formData, moduleId, ticketNumber, sla_response_due_at: responseDue })
.select().single()
// Handle assignment mode
const module = await getModule(moduleId)
if (module.assignment_mode === 'round_robin') {
await autoAssignRoundRobin(ticket.id, moduleId)
}
// Trigger email notification (via Supabase Edge Function)
await supabase.functions.invoke('send-notification', {
body: { event: 'ticket.created', ticketId: ticket.id }
})
revalidatePath('/queue/' + moduleId)
redirect('/tickets/' + ticket.id)
}

### 6.2  SLA Engine — Edge Function + pg_cron
// supabase/functions/sla-monitor/index.ts
// Triggered by pg_cron every 5 minutes
Deno.serve(async () => {
const supabase = createClient()
// 1. Find tickets at 80% SLA elapsed → send warning
const warningTickets = await supabase.rpc('get_sla_warning_tickets')
for (const ticket of warningTickets.data) {
await sendEmail({ event: 'sla.warning', ticket })
await supabase.from('notification_log').insert({ event_type: 'sla.warning', entity_id: ticket.id })
}
// 2. Find breached tickets → escalate + notify HOD
const breachedTickets = await supabase.rpc('get_sla_breached_tickets')
for (const ticket of breachedTickets.data) {
await supabase.from('tickets').update({ status: 'escalated' }).eq('id', ticket.id)
await sendEmail({ event: 'sla.breached', ticket })
}
// 3. Auto-close resolved tickets after 48 hours
await supabase.rpc('auto_close_resolved_tickets')
// 4. Send unassigned queue escalation emails
await supabase.rpc('check_unassigned_escalations')
return new Response('OK')
})

### 6.3  Asset Photo Upload — Mandatory Enforcement
// Supabase Storage: Two buckets
// 'asset-photos' — immutable (no delete policy via RLS)
// 'ticket-attachments' — normal CRUD for agents/admins
// Upload flow in Server Action:
async function recordStockMovement(data: StockMovementData, photos: File[]) {
if (photos.length === 0) {
throw new Error('At least 1 photo is required for this movement')
}
const uploadedPaths: string[] = []
for (const photo of photos) {
const path = `movements/${movementId}/${crypto.randomUUID()}`
const { error } = await supabase.storage
.from('asset-photos')
.upload(path, photo)
if (error) throw error
uploadedPaths.push(path)
}
// Create movement record (transaction via Supabase RPC)
const { data: movement } = await supabase.rpc('create_stock_movement', {
p_movement_data: data,
p_photo_paths: uploadedPaths
})
// Update asset status and stock ledger (all in DB function)
// Trigger handover email if movement_type = 'handover'
if (data.movement_type === 'handover') {
await supabase.functions.invoke('send-handover-email', {
body: { movementId: movement.id }
})
}
}

### 6.4  Meeting Scheduler — ICS Generation
// supabase/functions/send-meeting-invite/index.ts
function generateICS(meeting: Meeting, participants: Profile[]): string {
return [
'BEGIN:VCALENDAR',
'VERSION:2.0',
'PRODID:-//EIRMS//Meeting Scheduler//EN',
'METHOD:REQUEST',
'BEGIN:VEVENT',
`UID:${meeting.ics_uid}`,
`DTSTART:${formatICSDate(meeting.scheduled_at)}`,
`DTEND:${formatICSDate(addMinutes(meeting.scheduled_at, meeting.duration_minutes))}`,
`SUMMARY:${meeting.title} [Ticket: ${ticket.ticket_number}]`,
`DESCRIPTION:${meeting.agenda || 'See ticket for details'}`,
meeting.meeting_url ? `URL:${meeting.meeting_url}` : '',
meeting.location ? `LOCATION:${meeting.location}` : '',
...participants.map(p => `ATTENDEE;CN=${p.full_name}:mailto:${p.email}`),
'END:VEVENT',
'END:VCALENDAR'
].filter(Boolean).join('\r\n')
}
// Send via Resend with ICS attachment
await resend.emails.send({
from: 'eirms@yourcompany.com',
to: participants.map(p => p.email),
subject: `Meeting Invitation: ${meeting.title}`,
react: MeetingInviteEmail({ meeting, ticket }),
attachments: [{ filename: 'meeting.ics', content: Buffer.from(icsContent) }]
})

## 07  Security Architecture

### 7.1  Security Layers
Layer
Mechanism
What It Protects
Network
Vercel TLS 1.3 + Supabase TLS
All data in transit encrypted
Edge
Next.js Middleware (Vercel Edge)
Session validation before any page renders; role-based route blocking
Application
Zod schema validation on Server Actions
Prevents invalid/malicious input reaching DB
Database
Supabase RLS Policies
Data isolation per user role and module membership
Storage
Supabase Storage RLS + Immutable bucket
Asset photos cannot be deleted; signed URLs for access
Auth
Supabase Auth + Custom lockout logic
OTP, MFA, session management, failed-attempt lockout
Audit
audit_log table (immutable, 24-month)
All user actions logged for compliance and forensics

### 7.2  OWASP Top 10 Compliance Map
OWASP Risk
EIRMS Mitigation
A01 Broken Access Control
RLS on every table; role check in middleware; Server Actions re-validate auth
A02 Cryptographic Failures
TLS 1.3 in transit; AES-256 at rest via Supabase; bcrypt for password history
A03 Injection
Drizzle ORM parameterized queries; Zod input validation; no raw SQL with user input
A04 Insecure Design
Threat modelling in Phase 0; RLS-first design; confidential ticket model
A05 Security Misconfiguration
Supabase managed config; Vercel env secrets; no debug headers in production
A06 Vulnerable Components
Dependabot on GitHub; pnpm audit in CI; monthly dependency review
A07 Auth Failures
MFA for admins; account lockout; session timeout; password policy; OTP expiry
A08 Software Integrity Failures
Vercel build integrity; signed commits policy; CI gate on main branch
A09 Security Logging Failures
audit_log (immutable); Sentry error tracking; notification_log for all emails
A10 Server-Side Request Forgery
No user-controlled URL fetching; Edge Functions validate all external calls

## 08  Email Notification Architecture

### 8.1  Email Stack
All emails are built with React Email (apps/email/) and sent via Resend. Edge Functions act as the trigger layer, querying the DB for context before sending.
Component
Technology
Role
Template Engine
React Email + @react-email/components
Type-safe HTML emails with brand tokens
Email Sending API
Resend
Transactional email with delivery tracking
Trigger Layer
Supabase Edge Functions
Invoked by Server Actions and pg_cron
Template Editing
DB-stored overrides + WYSIWYG editor
Admins edit without code via Settings > Email Templates
ICS Generation
Custom Deno function
Meeting invites with .ics calendar attachment
Preview in Dev
React Email dev server
Preview all templates at localhost:3001

### 8.2  Email Trigger Inventory (Phase 1 — 40+ Triggers)
Domain
Event
Recipients
Ticketing
ticket.created
Requester + Module Admin
Ticketing
ticket.assigned
Agent + Requester
Ticketing
ticket.status_changed
Requester + Watchers
Ticketing
ticket.reply_added
Requester + Watchers
Ticketing
ticket.escalated
HOD + Module Admin + Requester
Ticketing
ticket.transferred
New Module Admin + Requester
Ticketing
ticket.pending_user
Requester (SLA pause notice)
Ticketing
ticket.resolved
Requester (+ CSAT survey link)
Ticketing
ticket.closed
Requester + Agent
Ticketing
ticket.reopened
Agent + Module Admin
Ticketing
sla.warning (80%)
Agent + Module Admin
Ticketing
sla.breached
Module Admin + HOD
Ticketing
csat.negative (< 3 stars)
Module Admin + HOD
Ticketing
daily.digest
Module Admin + HOD
Meeting
meeting.scheduled
All participants (+ .ics)
Meeting
meeting.reminder (30 min)
All participants
Meeting
meeting.rescheduled
All participants (updated .ics)
Meeting
meeting.cancelled
All participants (cancel .ics)
Asset
asset.handed_over
Employee + Asset Manager (inline photos)
Asset
asset.ack_reminder_48h
Employee + Asset Manager
Asset
asset.ack_escalation_72h
Employee + Manager + Asset Manager
Asset
asset.returned
Employee + Asset Manager
Asset
asset.write_off_approval
HOD (one-click approve/reject)
Asset
stock.low_alert
Asset Manager + IS Admin
Asset
warranty.expiring_30d
Asset Manager + IS Admin
Auth
account.created
New Employee (temp password)
Auth
self_reg.submitted
Admin (approve/reject link)
Auth
password.otp
Employee (6-digit OTP, 15 min)
Auth
password.changed
Employee (security confirmation)
Auth
account.locked
Employee (unlock instructions)
Auth
admin.password_expiry
Admin accounts (90-day policy)

## 09  Implementation Roadmap — Next.js + Supabase

### 9.1  Development Phases Mapped to PRD Roadmap
Phase
Weeks
PRD Phase
Key Deliverables
P0
1–2
Discovery & Design
Turborepo setup, Supabase project, DB schema v1, Drizzle config, CI/CD pipeline, Figma handoff, Shadcn/ui theme tokens
P1
3–5
User Auth & Foundation
Supabase Auth integration, profiles table, RBAC middleware, login UI, forgot password OTP, MFA for admins, force-change flow, bulk CSV import, user CRUD
P2
6–13
3-Module Ticketing
Scope selector, ticket form, full lifecycle, SLA engine (Edge Function + pg_cron), unassigned queue, assignment modes, live chat (Realtime), email engine (Resend), internal notes, CSAT
P3
14–15
Meeting Scheduling
Meeting form on ticket, ICS generation, Resend with .ics attachment, RSVP tracking, team calendar view, reschedule/cancel flow, 30-min reminder cron
P4
16–22
IT Asset & Stock Mgmt
Asset master, stock movements with mandatory photo upload (Supabase Storage), stock ledger view, handover email with inline photos, acknowledgement token, return/damage/write-off flows, My Assets employee panel
P5
23–24
Reporting & Analytics
All reports via Server Components + Drizzle queries, PDF export (Puppeteer Edge), Excel export (ExcelJS), executive dashboard, scheduled email reports, CSAT analytics
P6
25–26
Settings & Branding
Brand settings (logo, colors, fonts), theme engine with CSS variables, custom field builder UI, email template editor (DB-stored overrides), custom module builder
P7
27–28
Security & Infra
Full RLS audit, MFA enforcement, VAPT, Sentry setup, Vercel production config, Supabase Pro PITR backups, monitoring dashboard, load testing (k6)
P8
29–30
UAT & Training
UAT across all roles, defect triage, user training docs, knowledge base setup, go-live checklist
P9
31–33
Go-Live & Hypercare
Phased rollout (Auth → Ticketing → Assets), hypercare support, post-launch metrics review, Phase 2 planning

### 9.2  Day-1 Setup Checklist
Setup Task
✓
Create Turborepo monorepo with pnpm workspaces: apps/web, apps/email, packages/db, packages/ui, packages/types
✓
Scaffold Next.js 15 in apps/web with App Router, TypeScript strict mode, Tailwind v4, Shadcn/ui init
✓
Create Supabase project — enable Auth, Storage, Realtime, Edge Functions
✓
Install @supabase/ssr in Next.js, configure server/client Supabase helpers with cookie-based sessions
✓
Set up Drizzle ORM in packages/db — connect to Supabase Postgres via connection string
✓
Create initial migration: profiles, departments, modules, categories, sla_policies tables
✓
Configure Next.js middleware.ts — session check + role-based route protection
✓
Set up GitHub Actions CI: type-check, lint, Drizzle migration check, Vitest unit tests
✓
Configure Vercel project — connect GitHub, set environment variables, enable preview deployments
✓
Configure Resend domain and API key — create send-notification Edge Function stub
✓
Set up Sentry for both Next.js app and Supabase Edge Functions
✓
Create Supabase Storage buckets: asset-photos (immutable), ticket-attachments
✓
Seed development DB: 3 default modules, default categories, 4 test users (one per role)

## 10  Infrastructure, Scalability & Cost

### 10.1  Infrastructure Map
Service
Provider / Plan
Handles
Frontend Hosting
Vercel Pro
Next.js SSR/RSC, Edge Middleware, CDN, Preview URLs
Database
Supabase Pro (8GB RAM)
Postgres 16, connection pooling (PgBouncer), PITR backups
Auth
Supabase Auth (included)
Sessions, OTP, MFA — scales automatically
Realtime
Supabase Realtime (included)
WebSocket channels for chat and queue updates
Storage
Supabase Storage (100GB Pro)
Asset photos, ticket attachments, logos
Edge Functions
Supabase Edge Functions (Deno)
SLA cron, email triggers, ICS generation
Email
Resend (Pro — 50K emails/mo)
All transactional emails, delivery tracking
Error Tracking
Sentry (Team)
Frontend + Edge Function error capture
Analytics
PostHog (Cloud)
Product analytics, feature flags for gradual rollout

### 10.2  Monthly Infrastructure Cost Estimate
Service
Estimated Cost/mo
Notes
Vercel Pro
~$20
Covers SSR, edge functions, preview deployments
Supabase Pro
~$25
8GB DB, 100GB storage, PITR, unlimited Edge Functions
Resend Pro
~$20
50,000 emails/mo — sufficient for 500–2000 user org
Sentry Team
~$26
Error tracking for up to 5 developers
PostHog Cloud
~$0
Free up to 1M events/mo for internal product
TOTAL Phase 1
~$91/month
Extremely cost-efficient for internal enterprise tool

### 10.3  Scaling Path — When to Upgrade
Trigger
Scaling Action
Expected Cost Impact
DB > 70% CPU sustained
Upgrade Supabase to Large instance (16GB RAM)
+$50/mo
> 500 concurrent WebSocket users
Supabase Realtime usage within Pro limits; monitor
Included in Pro
Storage > 100GB (asset photos)
Upgrade Supabase storage or use Cloudflare R2
+$10–30/mo
> 50K emails/month
Upgrade Resend to Business plan
+$70/mo
Full-text search degrading
Add Typesense Cloud (Phase 2 recommendation)
+$30/mo
Phase 2 — mobile app
Supabase already API-first; add Expo app
No infra change

## 11  Performance Targets & Optimization Strategy

### 11.1  Performance Targets (PRD Requirements)
Metric
Target (PRD)
Implementation Strategy
Page Load Time
< 2 seconds (P95)
RSC for dashboards — server-rendered HTML; TanStack Query caching for subsequent navigations
API Response Time
< 500ms (P95)
Drizzle queries with proper indexes; Supabase connection pooling (PgBouncer built-in)
Email Delivery
< 60 seconds
Resend API p99 is ~5s; Edge Function trigger is near-instant
Concurrent Users
500+ without degradation
Next.js on Vercel scales horizontally automatically; Supabase handles 500+ connections via PgBouncer
System Uptime
99.5% monthly
Vercel SLA 99.99%; Supabase Pro SLA 99.9%; combined = well above target
RTO / RPO
< 4hr RTO, < 1hr RPO
Supabase Pro PITR (hourly); manual restore runbook documented in Phase 7

### 11.2  Key Database Indexes
-- Ticket query performance
CREATE INDEX idx_tickets_module_status ON tickets(module_id, status);
CREATE INDEX idx_tickets_requester ON tickets(requester_id);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_sla_response_due ON tickets(sla_response_due_at) WHERE status NOT IN ('resolved','closed','cancelled');
CREATE INDEX idx_tickets_unassigned ON tickets(module_id, created_at) WHERE assigned_to IS NULL;
CREATE INDEX idx_tickets_fts ON tickets USING gin(to_tsvector('english', subject || ' ' || description));
-- Asset query performance
CREATE INDEX idx_assets_sub_type_status ON assets(sub_type_id, status);
CREATE INDEX idx_assets_current_holder ON assets(current_holder_id) WHERE current_holder_id IS NOT NULL;
CREATE INDEX idx_assets_warranty ON assets(warranty_expiry) WHERE is_written_off = false;
CREATE INDEX idx_stock_movements_asset ON stock_movements(asset_id, created_at DESC);
-- Chat performance
CREATE INDEX idx_chat_ticket ON ticket_chat_messages(ticket_id, created_at);
-- Activity log performance
CREATE INDEX idx_activities_ticket ON ticket_activities(ticket_id, created_at DESC);
-- Audit log
CREATE INDEX idx_audit_user_date ON audit_log(user_id, created_at DESC);

## 12  Open Questions & Phase 2 Readiness

### 12.1  Decisions Required Before Development Starts
Question
Options
Recommendation
Email domain for EIRMS notifications?
Company domain vs. subdomain
Use noreply@eirms.yourcompany.com — verify in Resend
Self-registration approval flow — email or in-portal only?
Both / Email only / Portal only
Both — email link to approve + portal view for bulk
File size limits for ticket attachments?
PRD says 10MB / 5 files
Enforce in Supabase Storage policy + Next.js validation
Ticket number format?
HD-2026-0001 vs sequential
Module prefix + year + 4-digit sequence via DB function
Business hours per module — timezone?
Single org timezone vs. per-module
Single org timezone in Phase 1; configurable in Settings
VAPT provider for Phase 7?
Internal vs. external vendor
External vendor recommended — book in Week 20

### 12.2  Phase 2 — Architectural Readiness
Phase 2 Feature
Phase 1 Architecture Accommodates This By...
SSO / Active Directory
Supabase Auth supports SAML/OAuth providers — add in Auth settings, no schema change
Native Mobile App (iOS/Android)
Supabase is API-first (REST + Realtime); Expo app consumes same APIs; no backend change
AI Auto-Routing
Ticket module_id and category_id are set fields; AI layer overrides them — plug in as Edge Function
HRMS / ERP Integration
profiles table has employee_id and department_id — sync job writes to these; no schema change
Advanced Analytics / BI
All data in Postgres; PostHog already tracking events; connect Power BI directly to Supabase read replica
Additional Asset Categories
asset_sub_types is extensible; custom_fields handles additional attributes — no schema change
Custom Module Builder
modules table is data-driven; custom_fields + categories are already configurable — Phase 2 adds UI wizard

## 13  Recommended Team & Tooling

### 13.1  Team Composition for 33-Week Delivery
Role
FTE / Duration
Primary Responsibilities
Tech Lead / Architect
1.0 — Full
Architecture decisions, code review, Supabase schema, RLS policies, Edge Functions, security
Full-Stack Developer
2.0 — Full
Next.js pages, Server Actions, Drizzle queries, Supabase Realtime integration, report generation
Frontend Developer
1.0 — Full
Shadcn/ui components, dashboard UI, ticket forms, live chat UI, mobile-responsive layout
Backend / DB Developer
1.0 — W1–22
DB schema, migrations, complex RPC functions, SLA engine, stock ledger logic, indexes
UI/UX Designer
1.0 — W1–16
Figma designs for all screens, design system tokens, email template designs, UAT support
QA Engineer
1.0 — W20–30
Test cases for all modules, regression suite, UAT coordination, bug triage
DevOps (Part-time)
0.5 — W1–4, W27–28
CI/CD, Vercel config, Supabase production setup, monitoring, VAPT coordination

### 13.2  Development Tooling
Tool
Purpose
VS Code + Cursor
Primary IDE — Cursor AI assists with Drizzle schema and Server Actions
Supabase Studio
Database admin, RLS policy testing, Realtime channel debugging
Drizzle Kit Studio
Visual schema editor, migration diff viewer
React Email Dev Server
Preview all email templates at localhost:3001 during development
Storybook (Shadcn)
Component development and visual regression testing for UI package
Vitest + Testing Library
Unit tests for Server Actions, DB functions, and UI components
Playwright
E2E tests for critical user flows: login, ticket creation, asset handover
k6
Load testing for 500+ concurrent user target before go-live (Phase 7)
Linear
Sprint planning, ticket tracking for the EIRMS build project itself
Figma
UI designs and component specs; Dev Mode for direct CSS handoff
Architecture Summary
Next.js 15 + Supabase delivers every Phase 1 requirement from the EIRMS PRD with minimal operational overhead, strong security via RLS, real-time capabilities built-in, and a clear scaling path into Phase 2.
Estimated Infrastructure Cost: ~$91/month | Team: 6–7 people | Timeline: 33 Weeks
