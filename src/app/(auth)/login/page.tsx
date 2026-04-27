import { LoginForm } from "./login-form";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full bg-white font-sans selection:bg-primary/10 overflow-hidden">
      {/* Left Panel: Immersive Brand & Enterprise Visual */}
      <div className="hidden md:flex md:w-1/2 relative bg-slate-950 items-center justify-center overflow-hidden border-r border-white/5">
        <div className="absolute inset-0 z-0">
          <Image 
            src="/master_enterprise_infra_bg.png" 
            alt="Enterprise Infrastructure Master" 
            fill 
            className="object-cover opacity-70"
            priority
          />
        </div>
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-slate-950 via-slate-950/40 to-transparent" />
        <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(2,6,23,0.8)_100%)]" />
        
        <div className="relative z-20 px-20 space-y-10 max-w-2xl">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-[1.5rem] bg-white text-slate-900 flex items-center justify-center font-black text-4xl shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
              A
            </div>
            <div className="flex flex-col">
              <span className="text-4xl font-black text-white tracking-tight uppercase tracking-[0.1em]">ADIOS</span>
              <span className="text-xs text-primary font-black uppercase tracking-[0.4em] opacity-80">Enterprise Logic</span>
            </div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-5xl font-black text-white leading-[1.1] tracking-tighter">
              Operational <br/>
              <span className="text-primary underline decoration-primary/30 underline-offset-8">Intelligence</span> <br/>
              at Scale.
            </h2>
            <p className="text-slate-400 text-xl font-medium leading-relaxed max-w-lg">
              Manage enterprise support, logistical protocols, and team collaboration through a single, secure node.
            </p>
          </div>

          <div className="flex items-center gap-6 pt-10 border-t border-white/10">
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-10 w-10 rounded-full border-2 border-slate-900 bg-slate-800 shadow-xl" />
              ))}
            </div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] leading-tight">
              Integrated with <br/>
              Global Standards
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel: Clean Authentication Interface */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-start pt-4 sm:pt-6 md:pt-10 px-8 sm:px-12 md:px-20 bg-slate-50/30">
        <div className="w-full max-w-lg animate-in fade-in slide-in-from-right-12 duration-1000">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
