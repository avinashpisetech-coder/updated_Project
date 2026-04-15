import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 selection:bg-cyan-500/30">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 lg:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#22d3ee] text-[#020617] font-bold shadow-[0_0_15px_rgba(34,211,238,0.4)]">
              A
            </div>
            <div>
              <p className="text-xs font-bold tracking-tight text-slate-100 uppercase tracking-widest">ADIOS</p>
              <p className="text-[10px] text-slate-400 font-medium">
                Enterprise Issue &amp; Request Management System
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" size="sm" className="bg-white text-slate-950 hover:bg-slate-100 font-semibold px-4">
            <Link href="/login">Log in</Link>
          </Button>
        </header>

        <main className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <section className="space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl lg:text-4xl font-bold leading-[1.15] tracking-tight">
                <span className="text-slate-500/80">One colorful workspace for</span>{" "}
                <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                  every internal request
                </span>
                .
              </h1>
              <p className="text-sm md:text-base text-slate-400 max-w-xl font-medium leading-relaxed">
                Route, track, and resolve Help Desk, ERP, and General tickets from
                a single pane of glass. Rich SLAs, asset tracking, and activity
                history built in.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="group relative rounded-xl bg-slate-900/20 border border-emerald-500/20 p-4 transition-all hover:bg-slate-900/40 hover:border-emerald-500/40 shadow-xl overflow-hidden min-h-[120px]">
                <div className="absolute inset-0 bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/10" />
                <div className="relative z-10">
                  <p className="text-[10px] font-semibold text-emerald-400/90 mb-1 uppercase tracking-wider">
                    Help Desk
                  </p>
                  <p className="text-base font-bold text-slate-200">IT Support</p>
                  <p className="mt-2 text-xs text-slate-400 leading-snug">
                    Incidents, access, hardware, and software tickets in one queue.
                  </p>
                </div>
              </div>
              
              <div className="group relative rounded-xl bg-slate-900/20 border border-cyan-500/20 p-4 transition-all hover:bg-slate-900/40 hover:border-cyan-500/40 shadow-xl overflow-hidden min-h-[120px]">
                <div className="absolute inset-0 bg-cyan-500/5 blur-2xl group-hover:bg-cyan-500/10" />
                <div className="relative z-10">
                  <p className="text-[10px] font-semibold text-cyan-300/90 mb-1 uppercase tracking-wider">
                    ERP
                  </p>
                  <p className="text-base font-bold text-slate-200">Business Ops</p>
                  <p className="mt-2 text-xs text-slate-400 leading-snug">
                    Requests tied to core business workflows, approvals, and changes.
                  </p>
                </div>
              </div>

              <div className="group relative rounded-xl bg-slate-900/20 border border-indigo-500/20 p-4 transition-all hover:bg-slate-900/40 hover:border-indigo-500/40 shadow-xl overflow-hidden min-h-[120px]">
                <div className="absolute inset-0 bg-indigo-500/5 blur-2xl group-hover:bg-indigo-500/10" />
                <div className="relative z-10">
                  <p className="text-[10px] font-semibold text-indigo-300/90 mb-1 uppercase tracking-wider">
                    General
                  </p>
                  <p className="text-base font-bold text-slate-200">All Teams</p>
                  <p className="mt-2 text-xs text-slate-400 leading-snug">
                    Facilities, HR, admin, and all ad‑hoc internal requests.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button asChild size="default" className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold shadow-[0_4px_15px_rgb(8,145,178,0.3)] border-0 transition-transform hover:scale-105 active:scale-95">
                <Link href="/login">Get started</Link>
              </Button>
              <p className="text-xs text-slate-500 font-medium max-w-[200px]">
                Secure, role-based access for end users, agents, and admins.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-2xl bg-white p-6 shadow-xl">
              <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">
                Today&apos;s view
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 transition-colors hover:bg-slate-100/80">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
                    Open
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    24
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-blue-600 bg-blue-50 rounded-full px-2 py-0.5 inline-block">
                    8 within SLA
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 transition-colors hover:bg-slate-100/80">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
                    Breaching
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-500">
                    5
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5 inline-block">
                    Action req.
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 transition-colors hover:bg-slate-100/80">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
                    Resolved
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    17
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 inline-block">
                    On track
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-xl">
              <p className="text-xs font-bold text-slate-900 mb-4 uppercase tracking-widest">
                Why teams use ADIOS
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 group">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-transform group-hover:scale-150" />
                  <span className="text-sm text-slate-600 font-medium group-hover:text-slate-900 transition-colors">Unified portal instead of scattered emails and chats.</span>
                </li>
                <li className="flex items-center gap-3 group">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-transform group-hover:scale-150" />
                  <span className="text-sm text-slate-600 font-medium group-hover:text-slate-900 transition-colors">Clear SLAs, priorities, and status for every ticket.</span>
                </li>
                <li className="flex items-center gap-3 group">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-transform group-hover:scale-150" />
                  <span className="text-sm text-slate-600 font-medium group-hover:text-slate-900 transition-colors">Linked meetings, asset history, and full activity log.</span>
                </li>
              </ul>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
