"use client";

import Link from "next/link";
import { Home, ArrowLeft, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

function GoBackButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={() => router.back()}
      className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-[0.98] flex items-center gap-2"
    >
      <ArrowLeft className="h-4 w-4" />
      Go Back
    </Button>
  );
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center font-sans antialiased relative overflow-hidden">
      {/* Background grid ornament */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-xl px-8 py-16">
        {/* Status beacon */}
        <div className="flex items-center gap-2 mb-10 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-red-500">
            404 · Route Not Found
          </span>
        </div>

        {/* Icon block */}
        <div className="relative mb-6">
          <div className="relative z-10 h-32 w-32 rounded-[2rem] bg-card border border-border/50 shadow-2xl flex items-center justify-center mx-auto">
            <Search className="h-12 w-12 text-muted-foreground/40" />
            <div className="absolute inset-0 rounded-[2rem] border border-primary/20 animate-pulse" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black tracking-tight uppercase text-foreground mt-6 mb-2">
          PROTOCOL_NOT_FOUND
        </h1>

        {/* Subtitle */}
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] leading-relaxed max-w-sm mb-2">
          The requested route does not exist in the system matrix.
        </p>
        <p className="text-[10px] font-semibold text-muted-foreground/60 italic mb-10">
          It may have been moved, deleted, or you may have mistyped the URL.
        </p>

        {/* Divider */}
        <div className="w-full h-px bg-border/40 mb-10" />

        {/* Quick links */}
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Button
            asChild
            className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
          >
            <Link href="/dashboard" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Return to Home
            </Link>
          </Button>

          <GoBackButton />
        </div>

        {/* Footer hint */}
        <div className="mt-12 flex items-center gap-2 opacity-30">
          <Zap className="h-3 w-3 text-primary" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            Ticketing System · Error Code 404
          </span>
        </div>
      </div>
    </div>
  );
}
