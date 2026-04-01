# PERFORMANCE MANDATES

To ensure sub-second response times (<1s) across the entire EIRMS platform, the following rules MUST be followed in all code and database updates:

## 1. Database RLS (Row Level Security)
- **Rule of Early-Exit**: Every table MUST have a dedicated `FOR SELECT` policy for Super Admins that uses `public.is_super_admin_safe()`. 
- **Rule of Semi-Joins**: Avoid `ANY(SELECT ...)` in RLS policies. Use `EXISTS(SELECT 1 FROM ... WHERE ... LIMIT 1)` to prevent exponential O(N*M) full-table scans.
- **Rule of Non-Recursion**: Policies on a table MUST NOT query the same table directly. Always use a `SECURITY DEFINER` helper function to bypass recursion.

## 2. Server-Side Data Fetching (Next.js)
- **Rule of Parallelism**: NEVER use sequential `await` calls for independent database lookups. Use `Promise.all([...])` to collapse multi-step waterfalls into a single round-trip.
- **Rule of Memoization**: Use `getCachedUser()` at the start of every Server Component. This ensures exactly one Auth check per request lifecycle.
- **Rule of Shallow Selects**: Only select the columns required by the UI. Avoid `select("*")` on large tables to reduce network payload and RLS overhead.

## 3. UI/UX Engagement
- **Rule of Immediacy**: Every page that requires an external fetch MUST have a corresponding `loading.tsx` global loader or a scoped Skeleton component.
- **Rule of Streaming**: Use `Suspense` for non-critical dashboard panels (like activity feeds) to allow the primary shell to render instantly.

## 4. Data Integrity
- **Rule of History Separation (Operational vs Narration)**: To maintain a professional, high-density ERP interface, ticket history MUST be strictly bifurcated:
    - **Interaction & Reply History (The Registry)**: EXCLUSIVELY for human communication (replies, internal notes, initial descriptions). System logs MUST BE filtered out.
    - **Operational Journal (The Audit Trail)**: EXCLUSIVELY for system transitions (status changes, assignments, escalations). Human narration MUST BE filtered out to ensure a pure audit record.
    - **Redundancy Zero**: No single event should ever appear in both views simultaneously.

---
FAILURE TO FOLLOW THESE RULES RESULTS IN UNACCEPTABLE LATENCY (>1s).
