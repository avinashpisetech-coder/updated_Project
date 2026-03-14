# PRODUCT REQUIREMENTS DOCUMENT v1.0
## Enterprise Issue & Request Management System — EIRMS

PRODUCT REQUIREMENTS DOCUMENT  v1.0
Enterprise Issue &
Request Management
System  —  EIRMS
Module-Based Multi-Department Ticketing  •  IT Asset & Stock Management
3 MODULES + SCOPE SELECTOR
Help Desk · ERP · General
Employee picks scope (IT or ERP) when raising ticket · Auto-routed · One portal for all
IT ASSET & STOCK MGMT
Full Lifecycle
Opening · Purchase · Handover · Return · Damaged · Write-Off · Stock Ledger
PLATFORM FEATURES
User Auth + Comm
Login · OTP · SSO · Meeting Scheduler · Team Calendar · Branding · Custom Fields · User CRUD Access Control
Version

### 1.0 — Initial Release
Architecture
3 Modules (Help Desk, ERP, General) + Scope Selector. One portal for all employees.
Phase 1 Focus
Ticketing (all modules) + IT Asset & Stock Management + User Auth + Communication
Phase 2
ERP Financial Tools (Vendor, Invoice, Budget) + Mobile App + Integrations
Classification
Internal — Confidential
Prepared By
IS / Product Management Team
Status
Draft — Awaiting Stakeholder Approval

## 1. Executive Summary
The Enterprise Issue & Request Management System (EIRMS) is the organization's single unified portal for raising, tracking, and resolving all internal issues and requests — across every department and every function. The core architectural principle is module-based segregation: each department or team operates its own dedicated module with its own queue, agents, SLAs, and categories. Employees always use one portal, but their tickets are automatically routed to the correct module and team.
In addition to the ticketing system, EIRMS provides full IT asset and stock lifecycle management — tracking every IT device from the moment it enters inventory through handover to an employee, return, repair, and write-off — with mandatory photo evidence and automated employee notifications at every stage.
Module / Feature
What It Does
Priority
Help Desk Module
IS/IT team manages all IT issues — hardware, software, network, access, cybersecurity, device setup. Employees select IT scope when raising ticket.
Phase 1 — Core
ERP Module
ERP support team manages all ERP software issues — bugs, access, data errors, workflow issues, training, configuration for SAP/Oracle/custom ERP.
Phase 1 — Core
General Module
Catch-all for any issue that doesn't clearly fit Help Desk or ERP. Super Admin reviews and routes to the correct module within 4 business hours.
Phase 1 — Core
Scope Selector
When raising a ticket, employee first picks scope: IT Issue / ERP Issue / Not Sure. System auto-routes to the correct module — no manual routing needed by the employee.
Phase 1 — Core
IT Asset & Stock Mgmt
Full lifecycle: opening stock → purchase inward → handover → return → damaged → write-off. Stock ledger. Mandatory photos. Employee assignment emails.
Phase 1 — Core
User Auth & Registration
Login, admin-created accounts, self-registration with approval, OTP forgot password, force change on first login. User CRUD access-controlled per role.
Phase 1 — Core
Meeting Scheduling
Schedule meetings linked to tickets with .ics email invitations. Team Calendar for Help Desk and ERP module teams.
Phase 1 — Core
Platform Settings
Theme (admin + user level), company logo, custom fields, email templates, custom modules.
Phase 1 — Core
Additional Modules
HR, Finance, Admin, Legal, Operations, Management — can be added as dedicated modules in Phase 2 using the Custom Module Builder.
Phase 2 — Deferred
ERP Financial Tools
Vendor register, invoice tracking, budget management, expense claims.
Phase 2 — Deferred
Mobile App + SSO
Native iOS/Android app + Active Directory/Google SSO login.
Phase 2 — Deferred

## 2. Module-Based Architecture
Core Concept: EIRMS has 3 modules — Help Desk, ERP, and General. When an employee raises a ticket they first select the Scope of their issue (IT-related or ERP-related). The system routes to the right module automatically. If unsure, they pick General and the Super Admin re-routes it.

### 2.1 The Three Modules
Module
Managed By
Scope / Purpose
Example Issues
Help Desk
IS / IT Team
All IT and infrastructure issues — hardware, software, network, access, devices, cybersecurity. Any issue where the resolution lies with the IS/IT team.
Laptop not working, software error, internet/VPN issue, email access, password reset, new device setup, system access request, virus/malware, printer issue
ERP
ERP Support Team
All issues related to ERP software systems — SAP, Oracle, custom ERP, or any business application managed by the ERP team.
ERP login issue, transaction error, wrong data in ERP, report not generating, workflow stuck in ERP, new ERP user access, ERP training request, ERP module configuration
General
Super Admin
Catch-all for any issue that does not clearly fit Help Desk or ERP. Super Admin reviews within 4 business hours and transfers to the correct module with a note.
Cross-functional queries, unclear scope, new types of issues not yet categorized, admin requests, any issue the employee is unsure where to direct

### 2.2 Scope Selection — How the Employee Decides
When an employee clicks New Ticket, the first step is Scope Selection — a simple two-option screen before any other field appears. This ensures correct routing without the employee needing to know the internal team structure.
Step
Screen Shown
Employee Action
1 — Start
'What kind of issue is this?' with three clear tiles
Employee selects one tile: IT / Infrastructure Issue   |   ERP / Software System Issue   |   Not Sure / Other
2a — IT selected
Module = Help Desk confirmed. Category dropdown loads Help Desk categories.
Employee selects category (Hardware / Software / Network / Access / Other IT) and fills ticket form
2b — ERP selected
Module = ERP confirmed. A secondary prompt: 'Which ERP system or module is affected?' (e.g., SAP, Oracle, custom app name).
Employee names the ERP system and selects category (Access / Transaction / Data / Report / Workflow / Training / Other ERP)
2c — Not Sure
Module = General. Employee shown: 'Don't worry — describe your issue and our team will route it to the right person'.
Employee fills free-text description. Super Admin reviews and re-routes within 4 business hours. Employee notified when transferred.
3 — All paths
Ticket form completed with subject, description, priority, and attachments
Employee submits. SLA timer starts. Ticket appears in correct module queue.
Why 3 modules is correct for Phase 1: Keep it simple. The IS and ERP teams are the primary technical support teams. All other internal requests (HR, Finance, Admin, etc.) can be logged as General tickets and routed manually. Additional dedicated modules (HR, Finance, Admin, Legal, Operations) can be added in Phase 2 as separate module configurations once the platform is adopted.

### 2.3 How It Works — End-to-End Flow
Step
Who
Action
1
Employee
Logs in to EIRMS portal (single URL for all staff regardless of department)
2
Employee
Clicks New Ticket → Scope Selection screen → picks IT, ERP, or Not Sure
3
Employee
Fills ticket form: category, subject, description, priority, attachments
4
System
Ticket auto-routed to the matching module queue. SLA timer starts immediately.
5
Module Agent
Agent receives email alert. Opens ticket in their module queue. Assigns to self or team member.
6
Agent
Works on issue — adds updates, internal notes, public replies, schedules meeting if needed
7
System
Email sent to employee at every status change and when agent replies
8
Employee
Tracks progress in My Tickets. Replies via email or portal.
9
Agent
Resolves ticket. Employee receives resolution email + CSAT survey.
10
Super Admin
For General tickets: reviews, adds routing note, transfers to Help Desk or ERP. Employee notified.

## 3. User Authentication & Registration
User creation, editing, and deactivation are access-controlled — defined in the Role permissions matrix, not hardcoded to Super Admin only

### 3.1 User CRUD — Access Control
Who can create, view, edit, or deactivate users is configured in the Roles & Permissions matrix by the Super Admin. This means a Dept Admin can be given permission to manage users within their own department, while an Agent has read-only access to the user directory. The following table shows the default permission set — Super Admin can adjust any of these.
User Management Action
Super Admin
Dept Admin (own dept)
Module Agent
End User
Create new user account
✓ — any dept
✓ — own dept only
✗
✗
Bulk import users via Excel/CSV
✓
✗
✗
✗
View user list / directory
✓ — all
✓ — own dept only
✓ — read only
✗
Edit user profile / details
✓ — any user
✓ — own dept only
✗
Own profile only
Change user role / permissions
✓
✗
✗
✗
Reset user password (admin)
✓
✓ — own dept only
✗
✗
Deactivate / suspend account
✓
✓ — own dept only
✗
✗
Reactivate account
✓
✓ — own dept only
✗
✗
Approve self-registration request
✓
✓ — own dept only
✗
✗
Delete user permanently
✓ only
✗
✗
✗
Permission customization: Super Admin can grant or restrict any row in the table above per role from Settings > Roles & Permissions. For example, if you want only Super Admin to create users (not Dept Admins), uncheck that permission for Dept Admin. Changes apply immediately.

### 3.2 User Registration Methods
Method
Description
Who Can Perform
Admin Creates Account
Authorized admin manually creates the user account — full name, employee ID, official email, department, designation, role. System sends account activation email with temporary password to the employee.
Super Admin or Dept Admin (if permission granted)
Bulk Import
Upload an Excel or CSV file with multiple employee records. System validates each row and creates accounts in one batch. An error report is generated for any invalid rows — allowing correction and re-import.
Super Admin only
Employee Self-Registration
Employee visits the EIRMS portal, clicks Register, and fills in: full name, employee ID, official email, department, designation. Account is created in Pending Approval state — it cannot be used until an authorized admin approves it.
Any employee — requires admin approval before activation
Admin Approves Self-Reg
Authorized admin receives an email notification for each new self-registration request. Admin reviews the request in the Admin Panel and clicks Approve or Reject. On approval: employee receives activation email with temporary password.
Super Admin or Dept Admin (if permission granted)

### 3.2 Login
Feature
Specification
Login Method
Email address + Password. Employee ID + Password also accepted (configurable).
Login URL
Single portal URL for all employees regardless of department or role. Role determines what they see after login.
Remember Me
Optional checkbox — stores session token for 30 days on the device. Not available for Admin and Super Admin roles.
Failed Login Attempts
Account locked after 5 consecutive failed attempts. Unlock via Forgot Password or Admin intervention.
Session Timeout
Auto logout after 30 minutes of inactivity. Configurable per role by Super Admin.
Concurrent Sessions
Users can be logged in from max 2 devices simultaneously. Configurable by Super Admin.
Force Re-authentication
Triggered on: password change, admin revocation, suspicious login from new location.
MFA (Admin Roles)
Multi-Factor Authentication mandatory for Super Admin and Dept Admin accounts. OTP sent to registered mobile number or email.

### 3.3 Forgot Password
Step
Action
System Behavior
1
Employee clicks Forgot Password on login page
Password reset page shown
2
Employee enters their registered email address
System checks if email exists. If not found: generic message shown (does not reveal if email exists — security best practice)
3
System sends OTP to registered email
6-digit OTP valid for 15 minutes. Email subject: EIRMS Password Reset OTP. Plain, clear email with no other links.
4
Employee enters OTP on reset page
OTP validated. If incorrect: 3 attempts allowed. If expired: option to resend.
5
Employee sets new password
Password must meet policy requirements (see 3.4). Confirmation field required. Old password cannot be reused (last 5 passwords blocked).
6
Password reset complete
Confirmation message shown. Employee redirected to login. Active sessions on other devices terminated.

### 3.4 Password Policy
Rule
Requirement
Minimum Length
10 characters
Complexity
Must contain: at least 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character (@#$%^&*!_-)
Common Password Block
Blocked list of 10,000 common passwords (e.g., Password@1, Welcome@1). System rejects these.
Password History
Cannot reuse any of the last 5 passwords
Expiry — End Users
No forced expiry (reduces support burden). User can change anytime from profile.
Expiry — Admin Roles
Mandatory change every 90 days. Reminder email at 80 days.
First Login
Employee must change temporary password on first login — cannot skip or dismiss.
Account Lockout
Locked after 5 failed attempts. Unlock via OTP email or Admin action.
Lockout Duration
Auto-unlock after 30 minutes, or immediately via Admin override.

### 3.5 User Profile
Full name, employee ID, designation, department, reporting manager — editable by user (name/dept) or Admin (all fields)
Profile photo upload — optional, shown in ticket threads and admin views
Contact: official email (primary), personal email (optional), mobile number
Notification preferences — configure which events trigger email, which go to in-app only
Theme preferences — light/dark mode, accent color, density, font size
My Assets shortcut — quick view of all IT assets assigned to them
My Tickets summary — open, resolved, pending count
Change password from profile — requires current password confirmation

## 4. Ticketing System
Any issue · Any department · Any employee · One portal · Routed to the right module automatically

### 4.1 Ticket Submission — Employee
Field
Type
Rule
Module
Dropdown
Which dept/module handles this? Required. Drives all downstream routing.
Category
Dropdown
Populated from selected module's configured categories. Required.
Sub-Category
Dependent dropdown
Populated from selected category. Required.
Subject
Text (max 150 chars)
One-line summary. Required.
Description
Rich text editor
Full detail. For IT issues: steps to reproduce. For HR: dates and context. Required.
Priority (Suggested)
Low / Medium / High / Critical
Employee suggests priority. Module Admin may override based on SLA policy.
Attachments
File upload
Images, PDFs, screenshots, logs, forms. Max 10MB per file, up to 5 files.
Affected Person
Text or employee lookup
Optional — if raising on behalf of another employee.
Affected Asset / System
Text or asset lookup
Optional — link to an IT asset record or name the ERP module / system affected.
Preferred Resolution Date
Date picker
Optional — for planning reference only.
Related Ticket
Ticket ID lookup
Optional — link to a related or previous ticket.
Department / Cost Centre
Auto-filled
From user profile. Editable if cross-dept request.

### 4.2 Ticket Lifecycle — Statuses
Status
Meaning
SLA Timer
New
Submitted — not yet reviewed or assigned by module team
Running
Assigned
Allocated to a specific agent — pending first action
Running
In Progress
Agent actively working on the issue
Running
Pending — User Response
Agent asked the requester a question — waiting for reply
PAUSED
Pending — Dept Review
Awaiting internal decision, testing, or approval within the module team
Running
Pending — Third Party
Awaiting vendor, software vendor, or external party
Running
Scheduled
Resolution scheduled for a specific date/time (e.g., maintenance window, meeting)
Running
Escalated
Elevated to Module Admin or HOD. Priority upgraded. SLA reset.
Reset
Resolved
Fix/resolution provided. CSAT survey sent to employee.
Stopped
Closed
Employee confirmed resolution, or auto-closed 48 hours after resolution.
Stopped
Cancelled
Withdrawn by employee or invalidated by Admin. Reason logged.
Stopped

### 4.3 Admin Ticket Actions
View full ticket: description, all attachments, complete activity log, SLA countdown timer
Add Internal Note — team-only note, never visible to the employee who raised the ticket
Add Public Reply — visible to requester; triggers immediate email notification to requester
Update status with mandatory transition note at every status change
Assign or reassign to another agent within the module — reason required; email sent to new agent
Transfer to a different module — context note required; new module team notified; employee notified
Escalate to Module Admin or HOD — priority upgraded; SLA reset; escalation owner assigned
Schedule Meeting or Log Call — linked directly to the ticket (see Section 6)
Merge duplicate tickets — secondary ticket archived and linked to primary
Link related tickets — for dependency or cross-module tracking
Add CC watchers — additional users (managers, HODs) receive all email updates
Attach files, resolution guides, screenshots, reference documents
Override due date — with mandatory justification logged in audit trail

### 4.4 Admin Task Creation
Module Admins can proactively create tasks for planned activities, audits, maintenance, or recurring compliance work — not dependent on employee submissions.
Task fields: title, description, module, category, priority, due date, estimated effort
Task types: Incident, Service Request, Problem, Change, Maintenance, Audit, Compliance, Project Task
Assign to one or more agents — individual or shared ownership
Attach checklist — task cannot be closed until all checklist items are ticked
Set recurrence: one-time, daily, weekly, monthly, quarterly
Admin tracks progress, adds notes, reassigns, or escalates at any time
Assigned agents receive immediate email on task creation and daily reminders when due date approaches

### 4.5 Activity-Based Tasks — Employee
Employees can raise structured, multi-module tasks linked to standard business activities. The system auto-fills fields, routes to the correct modules simultaneously, and sends targeted emails.
Activity
Modules Triggered
Auto-Created Sub-Tasks
New Employee Onboarding
Help Desk + HR + Admin
Device & access setup → Help Desk; Email/system creation → Help Desk; ID card → Admin; Payroll setup → HR; Induction schedule → HR
Employee Exit / Offboarding
Help Desk + HR + Admin + Finance
Account deactivation → Help Desk; Device return → Admin; Final settlement → Finance; Exit interview → HR; Access revocation → Help Desk
System / App Access Request
Help Desk or ERP
Access ticket with system name, access type, manager approval trigger — routed to Help Desk (infra) or ERP (ERP system)
New Hardware Request
Help Desk
Device request ticket with type, quantity — auto-assigned to Asset Manager
Software Installation
Help Desk
Software ticket with license check flag for paid software
ERP Issue Reporting
ERP
ERP issue ticket with system name, module affected, error description, screenshot
Reimbursement Request
Finance
Expense claim with receipt upload; manager approval trigger
Payroll Query
Finance + HR
Payroll query ticket; HR notified as CC
Contract / Legal Review
Legal
Contract review ticket with document attachment; legal officer assignment
Compliance / Audit Request
Legal + Help Desk + Finance
Multi-module audit ticket; document collection checklist; compliance officer alert
Facility / Office Request
Admin
Facility ticket with location, issue type, urgency
Grievance / Incident Report
HR
Confidential ticket; HR Manager direct alert only; escalation SLA applied

### 4.6 SLA Configuration
Priority
Response Target
Resolution Target
Auto-Actions on Breach
P1 — Critical
15 minutes
4 hours
Immediate email to HOD + Module Head. Ticket flagged red on all dashboards.
P2 — High
1 hour
1 business day
Email alert to Module Admin + HOD.
P3 — Medium
4 hours
3 business days
Email alert to assigned agent and Module Admin.
P4 — Low
1 business day
5 business days
Daily digest flags overdue tickets.
SLA policies configured independently per module — Help Desk P1 may differ from HR P1
SLA timer pauses on Pending — User Response; resumes on employee reply
Warning email at 80% of SLA time elapsed — sent to assigned agent
Business hours calendar per module: working days, start/end time, public holidays list

### 4.7 Unassigned Ticket Queue & Self-Assignment
End users do not need to know who to assign a ticket to. All newly raised tickets land in the Unassigned Queue. Agents or Admins then assign or self-pick tickets.
When an employee raises a ticket, the assignment field is intentionally hidden from the ticket submission form. The employee only fills in their issue details. The ticket automatically enters an Unassigned state in the relevant module queue. From there, assignment happens in one of three ways depending on the module configuration.
4.7.1 Ticket Flow: Unassigned → Assigned
Step 1 — Ticket Raised by End User: Employee submits ticket. No assignment field shown. Status = New / Unassigned. Ticket appears in the module’s Unassigned Queue visible to all agents and admins of that module.
Step 2 — Notification: All agents and Module Admin for that module receive an email/in-app alert: “New Unassigned Ticket — [Ticket ID] — [Subject]”. SLA timer starts immediately.
Step 3a — Admin Assignment: Module Admin opens the ticket from the Unassigned Queue and assigns it to a specific agent. Assignment reason is optional. Assigned agent receives an email notification. Ticket status changes to Assigned.
Step 3b — Agent Self-Pick (if configured): If the module is configured to allow agent self-assignment, any available agent can open an unassigned ticket and click “Pick Up / Assign to Me”. The ticket is immediately removed from the Unassigned Queue and assigned to that agent. Activity log records the self-pick action with timestamp.
Step 4 — Employee Notified: Once the ticket is assigned, the employee who raised the ticket receives an email: “Your ticket [ID] has been assigned to [Agent Name] and is now being worked on.” Agent name and contact are shown in My Tickets view.
4.7.2 Unassigned Queue — UI & Behaviour
The Unassigned Queue is a dedicated view in the Admin/Agent panel, clearly separated from My Tickets and All Tickets views. It shows only tickets with no assigned agent.
Badge count on the Unassigned Queue nav item shows the live count of unassigned tickets. Count highlighted in amber if any ticket has been unassigned for more than 1 hour; red if SLA response target is at risk.
Each row in the queue shows: Ticket ID, Subject, Category, Priority, Module, Raised By, Time Since Submission, SLA Time Remaining, and action buttons (Assign / Pick Up).
Bulk assignment: Module Admin can select multiple unassigned tickets and assign them all to one agent in a single action.
Auto-escalation: If a ticket remains Unassigned for a configurable threshold (default 2 hours for P1/P2, 4 hours for P3, 8 hours for P4), the system automatically sends an escalation email to the Module Admin and flags the ticket red in the queue.
4.7.3 Assignment Mode Configuration (Per Module)
Module Admins configure the assignment behaviour per module from Settings > Module Configuration > Assignment Mode. Three modes are available:
Admin-Only Assignment: Only Module Admin or Super Admin can assign tickets. Agents see the queue but cannot self-pick. Suitable for teams with a dedicated dispatcher role.
Agent Self-Pick: Any active agent in the module can pick up unassigned tickets from the queue and assign them to themselves. First agent to click “Pick Up” wins. Admin retains override ability. Suitable for small, flat teams.
Round-Robin Auto-Assignment: System automatically assigns new tickets to the next available agent in rotation (only online/active agents included). Admin can override at any time. Load balancing report available in the Reporting module.
Note: Regardless of assignment mode, the Unassigned Queue always remains visible to Module Admins so they can intervene at any time. The end user is never required to select or know the assignee at ticket creation.

### 4.8 Live Chat — In-Ticket Real-Time Messaging
Live Chat is embedded directly inside the ticket screen. No screen switching, no closing the ticket. Agents and employees communicate in real time without leaving the ticket context.
The Live Chat panel is a persistent sidebar or bottom drawer within the open ticket view. It is available on every open ticket from the moment the ticket is created. Both the employee who raised the ticket and all agents/admins assigned to or watching the ticket have access to the chat panel simultaneously.
4.8.1 Chat Message Targeting — Broadcast vs. Direct
Before sending a message, the sender can optionally select a target recipient from a participant dropdown in the chat input bar. This drives notification behaviour:
No recipient selected (Broadcast / Everyone): Message is visible to all participants on the ticket (requester + assigned agent + CC watchers + Module Admin). All participants receive an in-app notification and email alert (subject to their notification preferences). Message appears in the chat panel for everyone. This is the default behaviour.
Specific recipient selected (@mention / Direct): Message is visible to all participants in the chat (full transparency is maintained — no hidden messages), but only the selected recipient receives an instant push/email notification. The message is visually tagged with “@[Name]” so all parties can see who was directly addressed. Suitable for asking a specific agent a question or sending an update to the requester only.
4.8.2 Chat Features & Capabilities
Real-Time Delivery: Messages delivered instantly via WebSocket connection. Typing indicator (“Agent is typing…”) shown to all participants. Read receipts show single tick (sent) and double tick (read) per message.
File Sharing in Chat: Users can attach files directly in the chat (images, PDFs, screenshots, documents). Files shared in chat are also appended to the ticket’s attachment list for permanent record-keeping.
Chat History Persistence: All chat messages are stored permanently as part of the ticket record. The full chat transcript is visible in the ticket’s Activity Log tab. Chat history is included in ticket exports and audit reports.
Online Presence Indicator: Each participant’s avatar in the chat panel displays a coloured presence dot: Green = Online, Yellow = Away, Grey = Offline. Helps senders know if a real-time response is likely.
Offline Notification Fallback: If the targeted recipient is offline, an email notification is sent automatically with the message content and a deep link back to the ticket chat. The message is waiting in the chat panel when they next log in.
Chat vs. Public Reply Distinction: Live Chat is for quick, informal, real-time communication. Public Reply (in the ticket thread) is for formal, structured updates that form part of the official ticket resolution record. Both are recorded, but they appear in separate tabs within the ticket view.
Promote Chat Message to Public Reply: An agent can right-click any chat message and select “Promote to Public Reply”. The message is then copied into the formal ticket reply thread and a status-update email is sent to the requester. Useful when a chat clarification becomes an important resolution note.
4.8.3 Chat Participants & Access Rules
Auto-participants: The ticket requester (end user) and the assigned agent are automatically added as chat participants when the ticket is created/assigned.
CC watchers added to the ticket (managers, HODs) are also added as read-only chat observers. They receive broadcast notifications but cannot send messages unless they are also an agent or admin.
When a ticket is reassigned to a different agent, the new agent is automatically added to the chat. The previous agent remains visible in chat history but is removed from active participants. New agent can see full chat history from ticket creation.
Chat is disabled on tickets in Resolved or Closed status. A banner is shown: “This ticket is closed. Reopen the ticket to send a message.” Reopening the ticket re-enables the chat panel immediately.
4.8.4 Chat Notification Summary
The table below summarises how notifications behave based on sender selection:
Scenario
Who Sees Message
Who Gets In-App Alert
Email Fallback (if Offline)
No recipient selected (Everyone)
All ticket participants
Everyone (pop-up to all)
Email to all offline participants
Specific user selected (@mention)
All ticket participants
Selected user only (pop-up targeted)
Email to selected user only (if offline)
Agent messages requester
All ticket participants
Requester notified (priority pop-up)
Email to requester with chat content

### 4.9 Additional Ticket Management Cases
The following scenarios extend the core ticket lifecycle to cover edge cases, exceptions, and operational realities encountered in enterprise support environments.
4.9.1 Ticket Re-open After Resolution
An employee can reopen a Resolved ticket within a configurable window (default 7 days) if the issue recurs or was not actually fixed. Reopening requires the employee to provide a reason. Status reverts to In Progress and the original assigned agent is notified.
After the reopen window expires, the ticket is auto-closed. The employee must raise a new ticket, which can reference the closed ticket ID using the Related Ticket field. Reopen count is tracked in the ticket record and visible in analytics.
4.9.2 Duplicate Ticket Detection & Merge
When a new ticket is submitted, the system performs a fuzzy-match check against open tickets from the same user in the same module within the last 30 days. If a likely duplicate is detected, the system flags it and suggests the possible parent ticket to the agent.
Agent can merge the duplicate into the parent ticket. The merged (secondary) ticket is archived, all its attachments and activity are copied to the parent, and the requester of the secondary ticket is added as a CC watcher on the parent. Both ticket IDs remain searchable.
4.9.3 Ticket Split
If a single ticket contains multiple distinct issues that should be handled separately (e.g., a hardware problem and an access request in one submission), an agent can split the ticket into two or more child tickets. Each child ticket inherits the original description and attachments; the agent adds specific scope notes to each. The original parent ticket is marked as Split and links to all child tickets. The employee is notified of the split with each child ticket ID listed.
4.9.4 Agent Availability & Workload Management
Agents can set their status to Available, Busy, or On Leave. When an agent is On Leave or Busy, they are excluded from round-robin auto-assignment. Module Admin can see a real-time workload view showing each agent’s open ticket count and current status.
If an agent goes On Leave with open tickets, Module Admin is prompted to bulk-reassign those tickets. System can also be configured to auto-reassign to a designated backup agent or return tickets to the Unassigned Queue for redistribution.
4.9.5 Ticket Templates & Quick-Create
Module Admins can create ticket templates for frequently occurring request types (e.g., “New Employee Laptop Request”, “VPN Access Request”). Templates pre-fill the module, category, subject, description format, and default priority. Employees select from a “Quick Create” template list when raising a ticket, reducing form completion time for common requests.
4.9.6 Approval Workflow on Tickets
Certain ticket categories can be configured to require manager or HOD approval before work begins (e.g., new software installation, new hardware purchase, access provisioning). On submission, the ticket enters a Pending Approval status. The configured approver receives an email with Approve / Reject options inline. If approved, ticket moves to Unassigned / Assigned. If rejected, ticket is closed with the rejection reason logged and the employee notified.
4.9.7 Confidential / Sensitive Tickets
Tickets for sensitive matters (HR grievances, payroll disputes, legal matters) can be marked Confidential at creation. Confidential tickets are visible only to the requester, the assigned agent, and the Module Admin — no other agents can see the ticket content or subject. CC watchers cannot be added to confidential tickets. The ticket appears in reports as a count only, with no content detail.
4.9.8 Ticket Tags & Custom Labels
Agents and admins can apply custom colour-coded tags to tickets (e.g., “Recurring Issue”, “Known Bug”, “Vendor Dependency”, “Training Required”). Tags are filterable in all queue and report views. Module Admins define the tag library per module. Tags are for internal use only and not visible to the employee who raised the ticket.
4.9.9 Ticket Watch / Follow
Any agent or admin (not necessarily the assigned agent) can click “Watch Ticket” to subscribe to all updates on a ticket without being assigned. Watchers receive the same status-change notifications as the assigned agent. Useful for team leads monitoring high-priority tickets or training agents shadowing ticket resolution. Watchers can remove themselves at any time.
4.9.10 Canned Responses / Response Templates
Agents can save and reuse frequently typed responses as Canned Responses (e.g., “Thank you for raising this ticket. We are investigating and will update you within [SLA] hours.”). Canned Responses are accessible via a shortcut button in the reply editor. They support dynamic placeholders: {Employee Name}, {Ticket ID}, {Agent Name}, {SLA Time}. Module Admins can publish shared canned responses for the whole team; agents can also maintain personal ones.

## 5. Module Category Configuration
Each of the three modules has pre-configured categories and sub-categories. Module Admins can add, rename, or disable any category from the Admin Panel without code changes. Categories are what the employee selects after choosing their scope.
Module
Pre-Built Categories
Example Sub-Categories
Help Desk
Hardware  |  Software  |  Network & Connectivity  |  Access & Accounts  |  Cybersecurity  |  New Employee Setup  |  Other IT
Laptop / Desktop issue, Monitor issue, Printer issue  |  Application error, OS issue, Software installation  |  Internet not working, Wi-Fi slow, VPN issue  |  Email access, New system access, Password reset, Account locked  |  Virus/Malware, Phishing email, Data breach concern  |  New device setup, User account creation, Access provisioning  |  Any IT issue not in above categories
ERP
System Access  |  Transaction Issues  |  Data & Reports  |  Workflow Issues  |  Training  |  Configuration Change  |  Other ERP
ERP login issue, New ERP user access, Role/permission change  |  Transaction error, Posting failed, Wrong amount  |  Report not generating, Wrong data displayed, Data entry correction  |  Workflow approval stuck, Process not triggering  |  Module usage training, New feature walkthrough  |  Module configuration update, Field setup change  |  Any ERP issue not in above categories
General
Uncategorized — All tickets in this module use a single free-text category
Employee describes issue in their own words. Super Admin reviews, adds an internal categorization note, and transfers to Help Desk or ERP with routing context. Employee notified when transferred.
Adding new categories: Any Module Admin can go to Settings > Module Configuration > [Module Name] > Categories and add a new category or sub-category in under 2 minutes. No developer involvement required. New categories appear in the ticket form immediately.

## 6. Meeting Scheduling & Communication
Schedule meetings linked to tickets + Team Calendar view for IS / module teams
When a ticket requires a face-to-face or remote discussion — a site visit, a call, or a screen session — the agent can schedule a meeting directly from within the ticket. The meeting is recorded in the ticket's activity log so the full resolution history stays in one place. The Team Calendar gives module teams visibility of all upcoming meetings across their queue.

### 6.1 Schedule a Meeting — Linked to Ticket
From any open ticket, the agent or admin clicks Schedule Meeting
Meeting form fields:
Meeting Title — auto pre-filled with the ticket subject; editable
Meeting Type — Online (link provided by agent) / Physical / Phone Call
Date — date picker
Time — time picker with 15-minute slots
Duration — 15 / 30 / 45 / 60 / 90 minutes
Participants — ticket requester auto-added; additional participants searchable from the user directory
Meeting Link — agent pastes any meeting URL (Google Meet, Teams, Zoom, Webex, or any other). Optional for physical meetings.
Location — for physical meetings: room name, floor, building address
Agenda — optional notes to share context with participants before the meeting
On Save:
Email invitation sent to all participants — includes meeting details, ticket reference, agenda, and a calendar attachment (.ics file compatible with Outlook, Google Calendar, Apple Calendar)
Meeting recorded in the ticket's activity timeline: scheduled by, participants, date/time, type
Ticket status auto-updated to Scheduled
Participants can Accept or Decline from within the email — response recorded in the ticket activity log
Reminder email sent to all participants 30 minutes before the scheduled meeting time
After the meeting, the agent marks it as Completed and adds a brief Meeting Outcome note — outcome is saved in the ticket activity log and is visible to all agents working on the ticket
If the meeting needs to be rescheduled: agent updates date/time from the ticket — updated invitation emails sent automatically to all participants
If cancelled: agent cancels with a reason — cancellation email sent to all participants; ticket status reverted to previous status

### 6.2 Team Meeting Calendar — Module View
Each module team (Help Desk and ERP) has a Team Calendar showing all meetings scheduled against tickets in their queue. This gives team leads and admins full visibility of the team's scheduled commitments.
Calendar views: Day / Week / Month — toggle between views
Each calendar entry shows: Ticket ID, employee (requester) name, meeting type, scheduled time, assigned agent, status (Upcoming / Completed / Cancelled)
Click any calendar entry to open the linked ticket directly
Filter calendar by agent — view one agent's scheduled meetings or the full team
Upcoming meetings highlighted in blue; overdue/missed meetings flagged in red
Agent can reschedule or cancel a meeting directly from the calendar without opening the ticket
Super Admin can view the calendar for both the Help Desk and ERP modules from one consolidated view

## 7. IT Asset & Stock Management
Full IT asset lifecycle: Opening Stock → Purchase Inward → Handover → Return → Damaged → Write-Off  |  Mandatory photo at every stage
Core Rule: No asset moves without a record. No record is complete without at least 1 photo. No handover is complete without employee email confirmation and acknowledgement.

### 7.1 IT Asset Types — Phase 1
Sub-Type
Examples
Mandatory Fields
Laptop / Desktop
Dell Latitude, HP EliteBook, MacBook, iMac
Serial no., brand, model, OS, processor, RAM, storage, warranty expiry
Mobile Phone / Tablet
iPhone, Samsung Galaxy, iPad, Android tablet
IMEI, phone no. (if SIM), OS version, serial no., warranty expiry
Monitor / Display
Dell UltraSharp, LG, Samsung
Serial no., screen size, resolution, warranty expiry
Accessories — Input
Keyboard, mouse, webcam, headset, microphone
Brand, model, serial no. (if available)
Accessories — Peripheral
Docking station, USB hub, external drive, portable SSD, power bank
Serial no., brand, model, storage capacity for drives
Networking Device
Wi-Fi adapter, VPN token, 4G dongle, user-assigned switch
Device ID, serial no., MAC address
Power Equipment
Laptop charger, user-assigned UPS
Brand, model, wattage, warranty expiry
Other IT
Any IT item — Admin defines sub-type
Serial no., description; additional fields via custom field builder

### 7.2 Stock Movement Types & Rules
Movement
Direction
Mandatory Photo
Key Fields
Stock Impact
Opening Stock
IN  (+)
Yes — stock photo of existing inventory
Sub-type, quantity, condition, entered-by, date, note
Available stock increases
Purchase Inward
IN  (+)
Yes — batch photo of received goods
Sub-type, qty, purchase date, vendor, invoice no., unit cost, total cost, condition = New
Available stock increases
Handover
OUT (−)
Yes — per unit photo at handover
Employee (lookup), asset code, qty, condition, handover note, expected return date (if temp loan)
Available decreases; Assigned increases
Return
IN  (+)
Yes — condition photo at return
Employee, asset, qty, condition at return (Good/Fair/Damaged), return reason
Good/Fair → Available increases. Damaged → Damaged pool. Does NOT go to Available.
Damaged / Write-Off
OUT (−)
Yes — damage photo mandatory
Asset code, damage description, damage source, repair OR write-off decision, HOD approval for write-off
Permanently removed from Available. Written-Off count increases.
Adjustment
IN/OUT
Yes — supporting evidence photo
Sub-type, qty, direction, reason, dual approval (Asset Manager + Super Admin)
Corrects ledger; full audit entry created

### 7.3 Live Stock Ledger
Ledger Column
Formula / Source
Opening Stock
Entered at go-live setup
Total Purchased
Sum of all Purchase Inward entries
Total Handed Over
Sum of all Handover entries
Total Returned (Usable)
Sum of returns where condition = Good or Fair
Total Damaged / Written Off
Sum of all Damaged and Write-Off entries
Currently Assigned
Count of active assignment records
Under Repair
Assets in Under Repair status — excluded from Available
Available Stock
= Opening + Purchased + Returned(Usable) − Handed Over − Damaged/Written Off − Under Repair  ← AUTO-CALCULATED, REAL-TIME
Low Stock Threshold
Configurable per sub-type — alert fires when Available falls below this number

### 7.4 Handover to Employee — Process
Asset Manager opens asset record → Assign to Employee
Select employee from user directory
Confirm / update condition at handover
Upload minimum 1 mandatory photo — form submission BLOCKED without photo. Up to 5 photos allowed.
Enter handover note and expected return date (if temporary loan)
System records: asset code, serial number, assigned to, assigned by, date, exact time, condition, all photos
Submit → stock ledger updates instantly → assignment email sent to employee
Handover Email to Employee — Contents
Email Section
Content
Subject
Asset Assigned to You — [Asset Name]  |  Ref: [Asset Code]
Asset Details
Name, code, sub-type, brand, model, serial number
Assignment Info
Assigned by (name, designation), date and exact time of handover
Condition at Handover
Condition field value + admin's handover note
Handover Photos
All photos displayed inline in the email — employee sees exact condition at time of handover
Return Date
Expected return date if applicable — highlighted in bold
Responsibilities
Keep safe; report damage immediately; return by due date; do not transfer to others without admin approval
Acknowledgement Button
One-click Acknowledge Receipt — employee confirms they received the asset. Required within 48 hours.
Raise Issue Link
Direct link to raise a Help Desk ticket for this asset — asset details auto-pre-filled in the ticket form
Reference
Assignment reference number and portal link to view full asset details

### 7.5 Return, Damaged & Write-Off
Return
Asset Manager selects Return Asset → selects employee → selects asset(s) being returned
Condition at return: Good / Fair / Damaged — mandatory. System shows the original handover photo alongside for comparison.
Upload mandatory return photo — minimum 1. Cannot submit without photo.
Select return reason: Employee Exit / End of Loan / Upgrade / Voluntary / Other
On submit: Good or Fair → asset status = In Stock, available stock increases
On submit: Damaged → asset moved to Damaged pool, damage record auto-created, available stock does NOT increase
Employee receives return confirmation email with condition assessment and reference number
Damaged & Write-Off
Damage record fields: asset code, damage description, damage source (Returned Damaged / Field Report / Audit Finding), damage photos (mandatory), reported by, date
Asset Manager decision: Send for Repair → status = Under Repair, vendor/tech assigned, estimated return date, employee notified
Asset Manager decision: Write Off → HOD approval required via one-click email
On write-off approval: asset archived permanently, finance team notified, written-off ledger count increases
Written-off assets are never deleted — full history always visible in archived records

### 7.6 My Assets — Employee View
My Assets section in User Panel — visible to every employee
Shows all IT assets currently assigned: photo, sub-type, condition, serial no., assignment date
Expected return date shown — amber alert within 7 days, red when overdue
Pending acknowledgements — assets assigned but not yet acknowledged
Full history of all assets ever assigned including past returns
Raise Repair Ticket button on each asset card — pre-fills asset details in Help Desk ticket form

### 7.7 Asset & Stock Dashboard — Admin
Live stock card per sub-type: In Stock | Assigned | Under Repair | Damaged | Written Off
Stock movement chart: Inward vs. Handover vs. Return vs. Damaged — monthly bar chart
Low stock alerts — sub-types below threshold highlighted red with quick-link to log purchase inward
Unacknowledged handovers — employee name, asset, days outstanding, send reminder button
Pending write-off approvals panel
Warranty expiry panel — assets expiring in next 30 days
Assets under repair — vendor, sent date, estimated return, overdue flag
Full searchable, filterable asset list — export to Excel / PDF

## 8. Email Notification Engine
Every significant event in EIRMS triggers a branded HTML email with a direct deep-link to the relevant ticket, asset, or meeting record.
TICKETING — Email Triggers
Trigger
Recipients
Key Content
Ticket created
Employee + Module Admin
Ticket ID, module, category, SLA commitment, portal link
Activity task created (multi-dept)
Employee + All assigned agents + Managers CC
Activity type, all sub-tickets, assigned modules, SLA per ticket
Ticket assigned to agent
Agent + Employee
Agent name, assignment note, SLA deadline
Admin task created & assigned
Assigned agent(s)
Task title, description, checklist, priority, due date
Status updated
Employee + Watchers
New status, update note, next expected action
Public reply added
Employee + Watchers
Full reply text, respond button link
Ticket transferred to new module
New Module Admin + Employee
Transfer reason, new module team, updated SLA
Ticket escalated
HOD + Module Admin + Employee
Escalation reason, new priority, SLA reset, escalation owner
Pending — awaiting user response
Employee
Agent's question, SLA paused notice, reply button
Employee responds to pending
Assigned agent
Employee's reply, SLA resumed
SLA warning — 80% elapsed
Agent + Module Admin
Time remaining, current status, ticket link
SLA breached
Module Admin + HOD
Duration overdue, ticket link, agent name
Meeting scheduled
All participants
Meeting details, ticket reference, .ics calendar attachment, join link if video
Meeting reminder
All participants
30-minute reminder, meeting link, ticket context
Meeting rescheduled / cancelled
All participants
Updated time or cancellation with reason
Ticket resolved
Employee
Resolution summary, CSAT survey link (1–5 star)
Ticket closed
Employee + Agent
Closure confirmation, resolution recorded
Ticket reopened
Agent + Module Admin
Reopen reason, employee message, SLA restarted
CSAT score < 3 stars
Module Admin + HOD
Score, employee comment, ticket link for follow-up
Daily digest
Module Admin + HOD
Open, resolved, SLA-breached, pending — for their module
Weekly summary
Leadership
Org-wide: volume by module, SLA compliance, top categories, CSAT avg
IT ASSET & STOCK — Email Triggers
Trigger
Recipients
Key Content
Asset handed over
Employee + Asset Manager
Asset name, code, serial, condition, ALL handover photos inline, assigned by + time, responsibilities, Acknowledge Receipt button
Not acknowledged — 48 hrs
Employee + Asset Manager
Reminder, asset details, Acknowledge button
Not acknowledged — 72 hrs
Employee + Manager + Asset Manager
Escalation to manager to follow up
Return confirmed — Good/Fair
Employee + Asset Manager
Return confirmed, condition, updated stock balance
Return confirmed — Damaged
Employee + Asset Manager + Admin
Damage noted, damage record created, repair/write-off decision pending
Asset sent for repair
Employee + Admin
Fault description, vendor/tech, estimated return date
Write-off approval requested
HOD
Damage details, photos, one-click Approve / Reject
Write-off approved
Asset Manager + Finance
Asset written off, authorised by, date
Low stock alert
Asset Manager + IS Admin
Sub-type, current available, threshold, quick-link to log inward
Warranty expiry — 30 days
Asset Manager + IS Admin
Asset details, expiry date, vendor contact
Warranty expiry — 7 days
Asset Manager + HOD
Urgent — immediate renewal or replacement needed
USER AUTH — Email Triggers
Trigger
Recipients
Content
New account created by Admin
New employee
Temporary password, portal URL, first-login instructions, must change password on first login
Self-registration submitted
Admin
New registration request, employee details, approve/reject link
Self-registration approved
Employee
Account activated, temporary password, portal URL
Self-registration rejected
Employee
Rejection reason, contact IS Admin for assistance
Forgot password OTP
Employee
6-digit OTP, valid 15 minutes, no other links in email
Password changed successfully
Employee
Confirmation that password was changed, timestamp, if not you — contact IS Admin link
Account locked
Employee
Account locked after 5 failed attempts, use Forgot Password to unlock
Admin password expiry reminder
Admin accounts
Password expires in 10 days, change now link

## 9. Reporting & Analytics

### 9.1 Ticketing Reports
Report
Description
Audience
Frequency
Module Summary Dashboard
Live view of all modules: open, in-progress, SLA-breached tickets
All Admins
Real-time
Ticket Volume by Module
Tickets raised per module over time — compare modules side by side
Leadership
Monthly
SLA Compliance
% tickets resolved within SLA — by module, category, priority, agent
HOD / Leadership
Monthly
Agent Performance
Tickets handled, avg response time, avg resolution time, CSAT score — per agent
Module Admin
Monthly
Module Performance
SLA compliance, volume, CSAT, resolution trend per module
Leadership
Monthly
Overdue Tickets
All tickets past SLA deadline — active and historical
Module Admin / HOD
Daily
Meeting & Call Log Report
All meetings and calls scheduled/logged: module, ticket, type, outcome, duration
Module Admin
Weekly
Category Heatmap
Most common issue categories per module — resolution rate, avg handle time
Module Admin
Weekly
Activity Task Report
Activity-based tasks: volume per type, completion rate, SLA, module breakdown
HOD / IS
Monthly
Reopened Tickets
Tickets closed and reopened — quality and resolution accuracy indicator
Module Admin
Monthly
CSAT Report
Satisfaction scores by agent, category, module — with employee comments
HOD / Leadership
Monthly
Audit Trail
Full log of all user actions, ticket changes, login events — immutable
Compliance
On-demand

### 9.2 IT Asset & Stock Reports
Report
Description
Audience
Frequency
Stock Ledger
Opening, purchased, handed over, returned, damaged, available balance per sub-type
Asset Manager / Finance
Monthly
Purchase Inward Log
All inward entries: date, sub-type, qty, vendor, invoice ref, logged by
Asset Manager
Monthly
Handover Log
All handovers: employee, sub-type, qty, date, condition, acknowledged or not
Asset Manager
Monthly
Return Log
All returns: employee, asset, date, condition, routed to In Stock or Damaged
Asset Manager
Monthly
Damaged & Write-Off Report
All damage records: description, photos, decision, authorised by, date
IS Admin / Finance
Monthly
Asset Chain of Custody
Full history of every movement per asset — every person, photo, and timestamp
Admin / Auditor
On-demand
Unacknowledged Handovers
Assets handed over but not acknowledged — employee name, days outstanding
Asset Manager
Daily
Assets Under Repair
Currently with vendor: sent date, estimated return, overdue flag
IS Admin
Weekly
Warranty Expiry
Expiring in 30 / 60 / 90 days with vendor contact details
IS Admin / Finance
Monthly
Employee Asset Summary
All assets currently with a specific employee — for exit checklist or audit
HR / Admin / Auditor
On-demand
IT Asset Register
Complete list with sub-type, status, serial no., assigned employee, condition, purchase date
IS Admin / Auditor
On-demand

### 9.3 Executive Dashboard — Leadership View
Module-wise ticket summary tiles: total open, SLA compliance %, avg resolution time — for every module
SLA compliance gauge per module: green > 90%, amber 75–90%, red < 75%
Top 5 most-raised issue categories this month across all modules
IT asset stock overview per sub-type: In Stock | Assigned | Under Repair | Damaged
Trend lines: ticket volume and CSAT score — 12-month rolling — by module
Overdue escalations requiring leadership attention
Drill-down on any metric to see underlying ticket or asset list

## 10. Platform Settings & Customization

### 10.1 Company Branding
Element
Specification
Appears On
Company Logo
PNG or SVG, min 200×200px, max 2MB — auto-resized per context
Login page, header, all emails, PDF reports
Company Name
Full name and short name
Email subjects, page titles, report headers
Favicon
32×32px ICO or PNG
Browser tab
Login Banner
Full-width image or gradient for login screen
Login and password reset pages
Login Tagline
One-line message below company name on login screen
Login page
Email Banner
600px-wide header image for all system emails
All outgoing emails
Email Footer
Legal disclaimer, contact info — appended to all emails
All outgoing emails
PDF Header
Logo + company name auto-placed on all exported PDF reports
All report exports
Module Icons
Each module can have a custom small icon shown in navigation
Navigation menu, ticket tags, emails

### 10.2 Theme — Admin Controls
Setting
Description
Scope
Primary Color
Core brand color — header bar, buttons, active links. Color picker + hex input.
Platform-wide
Secondary Color
Accent color for highlights, badges, notification dots.
Platform-wide
Font Family
Global UI font: Arial, Inter, Roboto, Open Sans, Nunito, Poppins.
Platform-wide
Module Colors
Each module assigned a distinct color tag — shown on tickets, emails, dashboards.
Per module
Default Mode
Light / Dark / System-default — applies to all new users. Users can override.
Platform default
Branding Lock
Optionally lock primary/secondary colors so user preference cannot override brand.
Admin-controlled

### 10.3 Theme — User Preferences
Preference
Options
Notes
Background Mode
Light / Dark / System
Saved server-side — persists across all devices
Accent Color
12-color palette within brand-safe range
Affects own buttons and highlights only
Sidebar Style
Expanded / Collapsed / Auto-hide
Personal navigation layout
Density
Comfortable / Compact / Spacious
Controls own row heights in lists and tables
Font Size
Small / Medium / Large
Accessibility — affects all text in their session
Notification Style
Toast pop-up / Banner / Silent
In-app notification display preference

### 10.4 Custom Fields
Add custom fields to any module: Ticketing, Assets, Activities — without code changes
Field types: Text, Multi-line Text, Number, Date, Date Range, Dropdown (single), Dropdown (multi), Checkbox, File/Image Upload, URL, Lookup/Reference
Fields can be Required, Optional, or Admin-only (hidden from end users)
Conditional display: show field only when another field equals a specific value
Drag-and-drop field order on form layout editor
Custom fields automatically appear in reports and Excel/CSV exports

### 10.5 Email Template Editor
All system email templates editable via visual rich-text editor — no code
Template variables: employee name, ticket ID, asset name, serial no., agent name, due date, company name, module, OTP, etc.
Preview mode — see exact email rendering before saving
Per-module email branding — Help Desk emails use IS branding; HR emails use HR branding
Test send — dispatch test version to any email address before activating

### 10.6 Custom Module Builder
Super Admin can create entirely new modules without code — e.g., Visitor Management, Canteen Booking, Training Enrollment, Safety Incident Register
Steps: define module name/icon/color → choose module type (Ticket-based or Record-based) → build form with custom fields → set categories, SLAs, routing → configure email events → publish

## 11. Cloud Infrastructure

### 11.1 Architecture Stack
Layer
Component
Recommended Technology
Frontend
Web Application
React.js or Vue.js — responsive SPA; desktop, tablet, and mobile browser
Backend API
Application Server
Node.js (Express) or Laravel — RESTful API with OpenAPI/Swagger docs
Database
Primary Data Store
PostgreSQL — all tickets, assets, users, modules, communications
Cache
Session & Queue Cache
Redis — user sessions, background job queue, frequently accessed data
File Storage
Photos & Documents
AWS S3 / Azure Blob / GCP Cloud Storage — asset photos immutable once linked
Email
Notifications
AWS SES / SendGrid / Microsoft 365 / SMTP
Search
Full-Text Search
Elasticsearch or Typesense — tickets, assets, knowledge base search
Queue / Workers
Async Processing
RabbitMQ / AWS SQS — email delivery, report generation, SLA monitoring jobs
CDN
Static Assets
AWS CloudFront / Azure CDN — fast asset photo loading in emails and portal
Monitoring
Observability
CloudWatch / Datadog + PagerDuty — uptime, error alerts, SLA breach monitoring
Backups
Data Protection
Hourly incremental backups + daily full snapshots + cross-region replication

### 11.2 Security
TLS 1.2+ for all data in transit; AES-256 for data at rest
RBAC enforced at application and database row level — users cannot access data outside their module/role scope
MFA mandatory for Super Admin and all Module Admin accounts
Asset photos stored as immutable objects — cannot be deleted once linked to a record
Full audit log: every login, action, status change, data modification — retained 24 months
VAPT (Vulnerability Assessment & Penetration Testing) before production go-live
OWASP Top 10 compliance verified in QA phase
Account lockout after 5 failed login attempts; force re-auth on password change

### 11.3 Availability Targets
Metric
Target
System Uptime
99.5% monthly
Page Load Time
< 2 seconds (P95)
API Response Time
< 500ms (P95)
Email Delivery
< 60 seconds from event trigger to employee inbox
Recovery Time Objective (RTO)
< 4 hours
Recovery Point Objective (RPO)
< 1 hour (hourly incremental backups)
Concurrent Users
500+ without performance degradation; horizontally scalable architecture

## 12. Phase 2 — Future Scope
The following features are intentionally deferred to Phase 2. They are architecturally planned for — the Phase 1 build will not require re-work to accommodate them. Phase 2 begins after Phase 1 is stable and adopted across the organization.
Feature
Description
Reason Deferred
ERP Financial Tools
Vendor register, invoice & payment tracking, budget management, expense claims workflow
Not core to ticketing or assets; Finance dept uses ticketing in Phase 1
Other Asset Categories
Office furniture, vehicles, software licenses, access cards, consumables
IT assets are the immediate priority; other categories follow once workflow is proven
SSO / Active Directory
Login via Microsoft 365, Google Workspace, or LDAP/AD
Requires integration with identity provider — Phase 1 uses email/password
Native Mobile App
iOS and Android native application for EIRMS
Phase 1 portal is mobile-responsive; native app adds richer UX in Phase 2
AI Auto-Routing
AI categorizes and routes tickets to the correct module automatically without employee selecting
Requires training data from Phase 1 ticket history
HRMS / ERP Integration
Sync employee data from SAP, Oracle, Workday; push ticket data to ERP
Requires API agreements with existing systems
Vendor Portal
External vendor login to view POs, submit invoices, and track payments
Dependent on ERP Financial Tools in Phase 2
Advanced Analytics & BI
Power BI or Tableau integration for deeper cross-module analytics and custom report builder
Phase 1 reports cover operational needs; deep analytics is Phase 2 value-add

## 13. Implementation Roadmap
Phase
Timeline
Deliverables
Phase 0 — Discovery & Design
Weeks 1–2
PRD sign-off, UI/UX wireframes for all modules, tech stack finalization, cloud environment setup, module category workshops with all HODs, asset type and SLA workshops
Phase 1 — User Auth & Foundation
Weeks 3–5
User registration (admin + self-reg + bulk import), login, forgot password OTP, password policy, user profiles, RBAC for all roles, basic email engine
Phase 2 — 3-Module Ticketing
Weeks 6–13
Help Desk module, ERP module, General module; scope selector UI; ticket submission, lifecycle, statuses, admin actions, SLA engine, admin task creation, activity-based tasks, email notifications
Phase 3 — Meeting Scheduling
Weeks 14–15
Meeting scheduler linked to tickets, .ics email invitations, participant accept/decline, meeting outcome notes, team calendar (Help Desk + ERP), reschedule and cancel flows
Phase 4 — IT Asset & Stock Mgmt
Weeks 16–22
Asset master register, all 6 stock movements with mandatory photos, stock ledger, employee assignment email with inline photos, acknowledgement tracking, return/damaged/write-off, My Assets panel, asset dashboard
Phase 5 — Reporting & Analytics
Weeks 23–24
All ticketing reports, all asset/stock reports, executive dashboard, export PDF/Excel, scheduled delivery, CSAT surveys, meeting/call report
Phase 6 — Settings & Branding
Weeks 25–26
Theme engine (admin + user), company logo/branding, custom field builder, email template editor, custom module builder
Phase 7 — Cloud & Security
Weeks 27–28
Production cloud deployment (multi-AZ), SSL/TLS, MFA, VAPT, monitoring, alerting, backup and DR validation
Phase 8 — UAT & Training
Weeks 29–30
UAT across all modules and roles, defect fixing, module admin training per dept, end-user portal training, knowledge base, go-live readiness checklist
Phase 9 — Go-Live & Hypercare
Weeks 31–33
Phased go-live: Auth + Ticketing first → then Assets → then Reports/Settings. Hypercare support. Post-launch review. Phase 2 planning.
Total Phase 1 duration: 33 weeks (approx. 8 months) — User Auth, 8-Module Ticketing, IT Asset & Stock Management, Communication, Reporting, Settings, and Go-Live.

## 14. Risks & Mitigations
Risk
Likelihood
Impact
Mitigation
Employees select wrong module when raising ticket
High
Low
Clear module descriptions with examples on selection screen; General/Other catch-all; Super Admin re-routes in < 4 hours; AI auto-routing in Phase 2
Module Admin not engaged / doesn't manage their queue
Medium
High
Executive mandate before go-live; each HOD nominates Module Admin during Phase 0 workshops; SLA breach escalates to HOD automatically
Asset photo upload skipped
Medium
High
Photo is hard-enforced — form cannot be submitted without minimum 1 photo; mobile-friendly camera upload supported
Low user adoption for self-registration
Medium
Medium
Admin bulk import for all existing employees before go-live; self-registration is a fallback, not primary method
OTP email for forgot password lands in spam
Low
High
Whitelist EIRMS email domain at organisation level before go-live; plain-text OTP email with no links avoids spam triggers
Meeting feature unused if no video platform adopted
Medium
Low
Agent can paste any meeting link; phone call log works independently of any video platform; feature is additive not blocking
Asset opening stock data quality at go-live
High
High
Physical IT asset audit required in Phase 0; bulk import template with validation; IS team sign-off before go-live
Scope creep from department-specific requests
High
High
Strict change control; all additions to Phase 2 backlog; PRD sign-off before build begins
Cloud infrastructure downtime
Low
High
Multi-AZ deployment, automated failover, RTO < 4 hours, documented and tested DR runbook
SLA disagreements between dept HODs
Medium
Medium
SLA values agreed and signed off in Phase 0 workshop before development; each module's SLA configured independently

## 15. Document Approval
This PRD requires written sign-off from all stakeholders before development commences. Any changes after sign-off must go through the formal Change Control Process with written justification and updated PRD version.
Role
Name
Department
Signature
Date
Project Sponsor (CEO / COO)
__________________
IS Manager / CTO
IS
__________________
HR Head
HR
__________________
Finance Head
Finance
______________
Admin / Facilities Head
Admin
________________
Legal / Compliance Head
Legal
________________
Operations Head
Operations
____________
ERP Team Lead
ERP / IT
_____________
Project Manager
IS
__________________
QA Lead
IS
__________________
Revision History
Version
Date
Author
Summary of Changes
1.0
March 2026
IS / Product Team
Complete PRD — Module-based 8-dept ticketing architecture, IT Asset & Stock Management (full lifecycle), User Auth (login/self-reg/OTP/password policy), Meeting & Call Scheduling linked to tickets, Platform Settings, Cloud Infrastructure. ERP Financial Tools deferred to Phase 2.
2.0
March 2026
IS / Product Team
v2.0 Update — Added Section 4.7: Unassigned Ticket Queue & Self-Assignment (end user no longer required to select assignee; Admin-Only, Agent Self-Pick, and Round-Robin modes); Section 4.8: In-Ticket Live Chat with broadcast and targeted @mention messaging, offline fallback, file sharing, presence indicators, and chat-to-reply promotion; Section 4.9: Additional Ticket Management Cases covering reopen, duplicate detection/merge, ticket split, agent availability/workload, templates, approval workflow, confidential tickets, tags, watch/follow, and canned responses.
