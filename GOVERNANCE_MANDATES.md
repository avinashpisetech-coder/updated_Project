# GOVERNANCE MANDATES

To ensure stability, scalability, and long-term maintainability of the EIRMS platform, the following rules MUST be strictly followed for all development activities.

## 1. Rule of Change Isolation (No-Regression Guarantee)
- **Zero Impact Policy**: New features or changes MUST NOT affect existing functionality. Any modification to a shared component or core library must be rigorously tested for regressions.
- **Atomic Commits**: Changes should be scoped to the specific requirement. Unrelated "cleanup" or refactoring should be handled in separate PRs/tasks unless it’s a direct dependency of the change.
- **Dependency Guard**: Before adding any new package or changing sensitive core logic (Auth, RLS, Layouts), analyze the ripple effect on existing modules.

## 2. Rule of Mandatory Planning (Plan-First Workflow)
- **Mandatory ARTIFACT**: No complex code changes (Logic, Database, UI Overhaul) should begin without a pre-approved `implementation_plan.md`.
- **The "What, Why, and How"**: Every plan must clearly outline:
    - **What** is being achieved.
    - **Why** the change is necessary (Business/Technical context).
    - **How** it will be implemented (Affected files, Schema changes, UI components).
- **Future-Proofing**: The plan must explain how the change accounts for future requirements and does not block scalability.

## 3. Rule of Verification (Mandatory Validation)
- **Manual Proof**: Every UI change must be validated across the intended screen size and zoom level (100% zoom benchmark).
- **Automated Validation**: For database or logic changes, run relevant tests or provide manual proof of correctness (e.g. Supabase RPC testing).
- **Regression Check**: After any change, a quick verification of the *existing* primary flows (Ticket creation, Asset navigation, etc.) is mandatory to ensure isolation was maintained.

## 4. Rule of Modern Aesthetics
- **Wow Factor**: Every UI element must follow the "Snow White" high-density, premium design system.
- **No Placeholders**: Never use generic colors or placeholder images. Use curated HSL palettes and generated high-quality assets.

---
FAILURE TO FOLLOW THESE RULES RESULTS IN SYSTEM INSTABILITY AND TECHNICAL DEBT.
