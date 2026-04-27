import Link from "next/link";
import {
  ArrowRight, ShieldCheck, Zap, BarChart3,
  Database, CheckCircle2, Lock, HeadphonesIcon,
  Building2, Kanban, Activity, Globe, ChevronRight, Layers
} from "lucide-react";

export default function HomePage() {
  const features = [
    { icon: HeadphonesIcon, title: "Help Desk", desc: "Full ticket lifecycle with SLA enforcement, escalation rules, and CSAT capture.", gradient: "from-[#e11d48] to-[#be123c]" },
    { icon: Database, title: "ERP Operations", desc: "Approval workflows and ERP modification pipelines with multi-level sign-offs.", gradient: "from-[#2563eb] to-[#1d4ed8]" },
    { icon: Building2, title: "General Inquiries", desc: "HR, Facilities, and cross-departmental requests standardized in one intake.", gradient: "from-[#059669] to-[#047857]" },
    { icon: Kanban, title: "Workspace & Tasks", desc: "Kanban boards, milestones, and team collaboration with activity feeds.", gradient: "from-[#7c3aed] to-[#6d28d9]" },
    { icon: BarChart3, title: "Intelligence Hub", desc: "Executive dashboards and multi-protocol analytics with real-time SLA data.", gradient: "from-[#d97706] to-[#b45309]" },
    { icon: Lock, title: "Access Control", desc: "Granular RBAC matrix with per-module permissions and full audit logging.", gradient: "from-[#0f172a] to-[#1e293b]" },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased overflow-x-hidden selection:bg-red-100">

      {/* ── NAVBAR ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-16 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center font-black text-white text-sm shadow-md shadow-red-200">A</div>
            <div>
              <p className="text-[13px] font-black tracking-[0.12em] text-slate-900 uppercase leading-none">ADIOS</p>
              <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest leading-none mt-0.5">Enterprise</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {["Platform", "Solutions", "Governance", "Pricing"].map(n => (
              <Link key={n} href="#" className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all">{n}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:text-slate-900 transition-colors">Sign In</Link>
            <Link href="/login" className="flex items-center gap-2 h-9 px-5 rounded-xl bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-slate-200">
              Get Started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── HERO ── */}
        <section className="pt-16 min-h-[92vh] flex flex-col" style={{background:"linear-gradient(135deg,#f8fafc 0%,#f1f5f9 40%,#fff1f2 100%)"}}>
          <div className="flex-1 max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-16 items-center py-20">
            {/* Left — Copy */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold uppercase tracking-widest">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse block" />
                v1.0.4 — Workspace Intelligence Now Live
              </div>

              <div className="space-y-5">
                <h1 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.05]">
                  The Enterprise<br />
                  <span className="text-red-600">Service Management</span><br />
                  Platform.
                </h1>
                <p className="text-lg text-slate-500 leading-relaxed max-w-lg font-medium">
                  Unify Help Desk, ERP operations, and project tasks under one roof. 
                  Built for governance, SLA compliance, and operational clarity.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link href="/login" className="flex items-center gap-2.5 h-12 px-8 rounded-xl bg-red-600 text-white font-bold text-[14px] hover:bg-red-700 transition-all shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-300 hover:scale-[1.02] active:scale-95">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="#features" className="flex items-center gap-2.5 h-12 px-8 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-bold text-[14px] hover:border-slate-300 hover:shadow-md transition-all">
                  See How It Works <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="flex items-center gap-6 pt-2 border-t border-slate-200">
                {[
                  [CheckCircle2,"No credit card required"],
                  [ShieldCheck,"SOC 2 Compliant"],
                  [Globe,"99.9% Uptime SLA"],
                ].map(([Icon,text]:any,i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-[12px] font-semibold text-slate-500">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Dashboard Mockup */}
            <div className="relative lg:block hidden">
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500/10 via-blue-500/5 to-violet-500/10 rounded-[3rem] blur-2xl" />
              <div className="relative rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xl shadow-slate-300/50">
                {/* Window bar */}
                <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-100">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  <div className="flex-1 mx-4">
                    <div className="h-5 bg-slate-200/60 rounded-md flex items-center justify-center">
                      <span className="text-[9px] text-slate-400 font-medium">adios.enterprise/dashboard</span>
                    </div>
                  </div>
                </div>
                {/* KPI row */}
                <div className="grid grid-cols-4 border-b border-slate-100 bg-white">
                  {[{l:"Open",v:"24",c:"text-blue-600",b:"bg-blue-50"},{l:"In Progress",v:"11",c:"text-amber-600",b:"bg-amber-50"},{l:"Resolved",v:"183",c:"text-emerald-600",b:"bg-emerald-50"},{l:"Breached",v:"2",c:"text-red-600",b:"bg-red-50"}].map((k,i)=>(
                    <div key={i} className="flex flex-col items-center py-5 border-r border-slate-100 last:border-0">
                      <div className={`text-2xl font-black tracking-tight ${k.c}`}>{k.v}</div>
                      <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-1">{k.l}</div>
                    </div>
                  ))}
                </div>
                {/* Ticket rows */}
                <div className="divide-y divide-slate-50">
                  {[
                    {id:"TKT-4821",sub:"VPN Access Request — Finance Dept.",st:"In Progress",c:"bg-amber-100 text-amber-700"},
                    {id:"TKT-4820",sub:"SAP Config Update — Procurement",st:"New",c:"bg-blue-100 text-blue-700"},
                    {id:"TKT-4819",sub:"Workstation Replacement — HR",st:"Resolved",c:"bg-emerald-100 text-emerald-700"},
                    {id:"TKT-4818",sub:"Email Setup — New Joiner Batch",st:"Assigned",c:"bg-indigo-100 text-indigo-700"},
                  ].map((t,i)=>(
                    <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/80 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[9px] font-mono font-bold text-slate-300 group-hover:text-slate-400 transition-colors">{t.id}</span>
                        <span className="text-[12px] text-slate-700 font-medium truncate">{t.sub}</span>
                      </div>
                      <span className={`ml-3 shrink-0 text-[9px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${t.c}`}>{t.st}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-medium">4 of 24 tickets</span>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />Live Feed
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats strip at bottom of hero */}
          <div className="border-t border-slate-200 bg-white/80 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-8 py-5 grid grid-cols-2 lg:grid-cols-4">
              {[
                {v:"98.4%",l:"SLA Compliance",icon:ShieldCheck,c:"text-emerald-600"},
                {v:"< 12 min",l:"Avg Response Time",icon:Zap,c:"text-amber-600"},
                {v:"10,000+",l:"Enterprise Users",icon:Globe,c:"text-blue-600"},
                {v:"4,200/day",l:"Tickets Processed",icon:Activity,c:"text-red-600"},
              ].map((s,i)=>(
                <div key={i} className="flex items-center gap-3 px-6 py-2 border-r border-slate-100 last:border-0">
                  <s.icon className={`h-5 w-5 ${s.c} shrink-0`} />
                  <div>
                    <p className="text-xl font-black text-slate-900 tracking-tight leading-none">{s.v}</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">{s.l}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="py-28 px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <span className="inline-block px-3 py-1 rounded-full bg-red-50 border border-red-100 text-red-700 text-[11px] font-bold uppercase tracking-widest">Platform Modules</span>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Everything your enterprise needs.</h2>
              <p className="text-lg text-slate-500 font-medium leading-relaxed">Purpose-built modules for IT, ERP, HR and project governance — integrated, role-aware, and audit-ready from day one.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f,i) => (
                <div key={i} className="group relative bg-white border border-slate-100 rounded-3xl p-8 hover:border-slate-200 hover:shadow-2xl hover:shadow-slate-100 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <f.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-[15px] font-bold text-slate-900 mb-2.5 tracking-tight">{f.title}</h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed font-medium">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS (DARK) ── */}
        <section className="py-28 px-8 bg-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-[-200px] w-[700px] h-[700px] rounded-full" style={{background:"radial-gradient(circle,rgba(225,29,72,0.12) 0%,transparent 70%)"}} />
          <div className="absolute bottom-0 left-[-200px] w-[600px] h-[600px] rounded-full" style={{background:"radial-gradient(circle,rgba(37,99,235,0.10) 0%,transparent 70%)"}} />
          <div className="relative max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-10">
                <div className="space-y-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-red-950 border border-red-900 text-red-400 text-[11px] font-bold uppercase tracking-widest">Workflow Engine</span>
                  <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">Request to<br />resolution,<br /><span className="text-slate-500">fully automated.</span></h2>
                  <p className="text-[15px] text-slate-400 leading-relaxed font-medium max-w-md">Every ticket flows through a configurable SLA engine with intelligent routing, real-time escalations, and complete audit trails.</p>
                </div>
                <div className="space-y-3">
                  {[
                    {n:"01",t:"Submit & Categorize",d:"Tickets via portal, email, or manual entry — auto-categorized on arrival."},
                    {n:"02",t:"Route & Assign",d:"SLA engine activates. Priority-based routing to the right agent instantly."},
                    {n:"03",t:"Resolve & Audit",d:"Full activity history logged. CSAT captured. Reports generated automatically."},
                  ].map((s,i)=>(
                    <div key={i} className="flex gap-5 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] hover:border-red-500/30 transition-all group cursor-default">
                      <span className="text-3xl font-black text-white/10 group-hover:text-red-700/50 transition-colors leading-none shrink-0 mt-1">{s.n}</span>
                      <div>
                        <h4 className="text-[14px] font-bold text-white mb-1">{s.t}</h4>
                        <p className="text-[13px] text-slate-500 leading-relaxed">{s.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SLA Panel */}
              <div className="space-y-5">
                <div className="p-7 rounded-3xl bg-white/[0.04] border border-white/[0.08]">
                  <div className="flex items-center justify-between mb-7">
                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">SLA Performance — This Month</p>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full flex items-center gap-1.5"><span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse block" />Live</span>
                  </div>
                  <div className="space-y-5">
                    {[
                      {l:"Critical Tickets",v:96,c:"bg-gradient-to-r from-red-500 to-rose-500"},
                      {l:"High Priority",v:91,c:"bg-gradient-to-r from-amber-500 to-orange-500"},
                      {l:"Standard",v:99,c:"bg-gradient-to-r from-blue-500 to-indigo-500"},
                      {l:"Low Priority",v:100,c:"bg-gradient-to-r from-emerald-500 to-teal-500"},
                    ].map((b,i)=>(
                      <div key={i}>
                        <div className="flex justify-between text-[12px] font-semibold mb-2">
                          <span className="text-slate-400">{b.l}</span>
                          <span className="text-white font-black">{b.v}%</span>
                        </div>
                        <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className={`h-full ${b.c} rounded-full`} style={{width:`${b.v}%`}} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {icon:Lock,t:"RBAC Compliant",s:"Per-module access"},
                    {icon:CheckCircle2,t:"Full Audit Trail",s:"Every action logged"},
                    {icon:Zap,t:"Auto-Escalation",s:"SLA breach prevention"},
                    {icon:Layers,t:"Multi-Department",s:"Cross-org isolation"},
                  ].map((c,i)=>(
                    <div key={i} className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] hover:border-white/10 transition-all">
                      <div className="h-9 w-9 rounded-xl bg-white/[0.08] flex items-center justify-center mb-3">
                        <c.icon className="h-4.5 w-4.5 text-slate-300" />
                      </div>
                      <p className="text-[13px] font-bold text-white">{c.t}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{c.s}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-28 px-8 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-[2.5rem] overflow-hidden p-14 md:p-20 text-center" style={{background:"linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)"}}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-30" style={{background:"radial-gradient(ellipse,rgba(225,29,72,0.6) 0%,transparent 70%)"}} />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
              <div className="relative space-y-7">
                <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/70 text-[11px] font-bold uppercase tracking-widest">Get Started Today</span>
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                  Transform your enterprise<br />
                  <span className="text-red-400">operations today.</span>
                </h2>
                <p className="text-[16px] text-slate-400 max-w-xl mx-auto font-medium leading-relaxed">
                  Join enterprise teams managing tickets, tasks, and compliance from one powerful platform.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                  <Link href="/login" className="flex items-center gap-2.5 h-13 px-10 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-[15px] transition-all shadow-2xl shadow-red-900/50 hover:scale-[1.02] active:scale-95" style={{height:"52px"}}>
                    Start Free Trial <ArrowRight className="h-4.5 w-4.5" />
                  </Link>
                  <Link href="#" className="flex items-center gap-2 h-[52px] px-10 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 hover:border-white/25 text-white font-bold text-[15px] transition-all backdrop-blur-sm">
                    Contact Sales
                  </Link>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold">No credit card required &nbsp;·&nbsp; SOC 2 Compliant &nbsp;·&nbsp; 99.9% Uptime</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-100 py-10 px-8 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center font-black text-white text-sm">A</div>
            <div>
              <p className="text-[12px] font-black tracking-[0.15em] text-slate-900 uppercase leading-none">ADIOS Enterprise</p>
              <p className="text-[9px] text-slate-400 font-medium mt-0.5">&copy; 2026. All rights reserved.</p>
            </div>
          </div>
          <div className="flex items-center gap-8 text-[12px] font-semibold text-slate-400">
            {["Privacy","Compliance","Security","System Status"].map(l => (
              <Link key={l} href="#" className="hover:text-slate-900 transition-colors">{l}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
