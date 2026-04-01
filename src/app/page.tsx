import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 font-bold">
              E
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">EIRMS</p>
              <p className="text-xs text-slate-300/80">
                Enterprise Issue &amp; Request Management System
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="border-slate-700 bg-slate-900/60 hover:bg-slate-800">
            <Link href="/login">Log in</Link>
          </Button>
        </header>

        <main className="grid gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start">
          <section className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                One colorful workspace for{" "}
                <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                  every internal request
                </span>
                .
              </h1>
              <p className="text-sm md:text-base text-slate-200/80 max-w-xl">
                Route, track, and resolve Help Desk, ERP, and General tickets from
                a single pane of glass. Rich SLAs, asset tracking, and activity
                history built in.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-emerald-500/5 border border-emerald-500/40 p-4 shadow-[0_0_40px_rgba(16,185,129,0.25)]">
                <p className="text-xs font-medium text-emerald-300/90 mb-1">
                  Help Desk
                </p>
                <p className="text-sm font-semibold">IT Support</p>
                <p className="mt-2 text-xs text-emerald-50/80">
                  Incidents, access, hardware, and software tickets in one queue.
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-cyan-500/20 via-cyan-500/10 to-cyan-500/5 border border-cyan-500/40 p-4 shadow-[0_0_40px_rgba(34,211,238,0.25)]">
                <p className="text-xs font-medium text-cyan-200/90 mb-1">
                  ERP
                </p>
                <p className="text-sm font-semibold">Business Ops</p>
                <p className="mt-2 text-xs text-cyan-50/80">
                  Requests tied to core business workflows, approvals, and changes.
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-indigo-500/20 via-indigo-500/10 to-indigo-500/5 border border-indigo-500/40 p-4 shadow-[0_0_40px_rgba(129,140,248,0.25)]">
                <p className="text-xs font-medium text-indigo-200/90 mb-1">
                  General
                </p>
                <p className="text-sm font-semibold">All Teams</p>
                <p className="mt-2 text-xs text-indigo-50/80">
                  Facilities, HR, admin, and all ad‑hoc internal requests.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-lg shadow-emerald-500/30">
                <Link href="/login">Get started</Link>
              </Button>
              <p className="text-xs text-slate-300/80">
                Secure, role-based access for end users, agents, and admins.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl">
              <p className="text-xs font-medium text-slate-300/80 mb-3">
                Today&apos;s view
              </p>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl bg-slate-900/80 border border-emerald-500/30 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-300/90">
                    Open tickets
                  </p>
                  <p className="mt-2 text-xl font-semibold text-emerald-400">
                    24
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-100/80">
                    8 within SLA
                  </p>
                </div>
                <div className="rounded-xl bg-slate-900/80 border border-amber-500/30 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-amber-300/90">
                    Breaching soon
                  </p>
                  <p className="mt-2 text-xl font-semibold text-amber-300">
                    5
                  </p>
                  <p className="mt-1 text-[11px] text-amber-100/80">
                    Needs attention
                  </p>
                </div>
                <div className="rounded-xl bg-slate-900/80 border border-indigo-500/40 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-indigo-200/90">
                    Resolved today
                  </p>
                  <p className="mt-2 text-xl font-semibold text-indigo-300">
                    17
                  </p>
                  <p className="mt-1 text-[11px] text-indigo-100/80">
                    Great progress
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3 text-xs text-slate-200/85">
              <p className="text-[11px] font-medium text-slate-200/90">
                Why teams use EIRMS
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Unified portal instead of scattered emails and chats.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>Clear SLAs, priorities, and status for every ticket.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span>Linked meetings, asset history, and full activity log.</span>
                </li>
              </ul>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
