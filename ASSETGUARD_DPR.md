# Detailed Project Report (DPR): Enterprise IT Asset Management (ITAM) System

## 1. Executive Summary
**Project Title:** "AssetGuard" – Integrated IT Asset Lifecycle Management System
**Objective:** To develop a centralized, web-based application that eliminates shadow IT, optimizes asset utilization, ensures software license compliance, and automates the complete lifecycle of hardware and software assets.
**Target Users:** IT Administrators, Procurement Team, HR (Onboarding/Offboarding), Finance, and End-Users.

---

## 2. Business Process & Lifecycle Scope
The application must strictly follow the ITAM Lifecycle Framework. Development logic enforces these distinct states:
    - **Planning & Request:** Budget allocation, fiscal year-wise provisioning, and requirement gathering.
    - **Procurement:** Vendor selection, PO generation, and Goods Receipt Note (GRN).
3.  **Inventory/Storage:** Tagging (Barcode/QR), Stockroom management.
4.  **Deployment (Allocation):** Assigning to users, locations, or departments.
5.  **Maintenance/Usage:** Repairs, upgrades, and physical auditing.
6.  **Retirement & Disposal:** E-waste management, data wiping, and financial write-off.

---

## 3. Functional Modules

### Module G: Budget Provision & Fiscal Forecasting (Existing)
**Business Goal:** Prevent budget overruns and ensure fiscal accountability.
- **Year-wise Budgeting:** Allocate amounts to specific asset types (e.g., IT Assets, Office Equipment) per fiscal year.
- **Consumption Tracking:** Real-time visibility into Spent vs. Allocated budget during the PO lifecycle.
- **Company & Project Granularity:** Budgeting at the corporate or individual project level.

### Module A: Procurement & Vendor Portal
**Business Goal:** Stop over-purchasing and track warranty start dates accurately.
- **IT Dispatcher Protocol:** Dispatcher creates requisitions on behalf of new joiners (Role: IT Dispatchperson).
- **Indent Management (Stock Gap Analysis):**
    - If stock unavailable: Create **Indent**.
    - **Transfer Type:** IT Admin transfers from other stores/locations.
    - **PO Type:** IT Admin converts Indent to Purchase Order.
- **PO Tagging:** Consolidate multiple Indents into a single PO based on Project grouping.
- **Automated GRN:** High-speed scanning of "Master Cartons" to auto-hydrate inventory into specific **Project >> Store >> Department** containers.

### Module B: Asset Repository (The Core Database)
**Business Goal:** A "Single Source of Truth" for HAM and SAM.
- **Asset Categories:** Hierarchical structure (e.g., Hardware > Compute > Laptop > MacBook Pro).
- **Unique Identification:** System-generated Asset ID linked to Serial Number and QR.
- **Relationship Mapping:** Link assets to each other (e.g., Monitor connected to Desktop).

### Module C: Lifecycle & Assignment Management
**Business Goal:** Know who has what and where.
- **Check-in/Check-out Logic:**
    - **Check-out:** Assign asset to Employee/Dept. Trigger email acknowledgement.
    - **User Acceptance Registry:** Self-service portal for employees to acknowledge receipt of assets (Update status to "Received").
- **Movement Tracking:** Gate pass generation for moving assets between locations.
- **Depreciation Engine:** Auto-calculate current value using Straight Line or Declining Balance.

### Module D: Software Asset Management (SAM)
**Business Goal:** Avoid audit penalties and cut unused SaaS costs.
- **License Repository:** Store license keys, seat counts, and expiry dates.
- **Soft-Allocation:** Link software license to a hardware asset or user email.
- **Compliance Dashboard:** Purchased Seats vs. Active Users alerts.

### Module E: Maintenance & Helpdesk Integration
**Business Goal:** Extend asset life and track Total Cost of Ownership (TCO).
- **Ticket Linking:** Show asset age, specs, and repair history to technicians.
- **Preventive Maintenance:** Automated alerts for scheduled service.
- **RMA Tracking:** Track assets sent to vendors for repair.

### Module F: Disposal & Compliance
**Business Goal:** Secure data disposal and environmental compliance.
- **Disposal Workflow:** Request Scrapping → Finance Approval (Write-off) → Vendor Pickup.
- **Disposal Certificate:** Upload "Certificate of Destruction" from vendors.
- **Audit Trail:** Immutable logs of every action (Created, Edited, Deleted, Moved).

---

## 4. Non-Functional Requirements
- **RBAC:** Super Admin (Full), IT Tech (Edit Inventory, No Delete), Finance (Read-only Cost), Employee (View Own).
- **Scalability:** PostgreSQL schema supporting 50,000+ assets.
- **Architecture:** API First; support for Mobile scanning and Discovery Agent.

