import { createClient, getCachedUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function ReportsDashboardPage() {
  const user = await getCachedUser();
  const supabase = await createClient();

  if (!user) redirect("/login");

  // Fetch role-isolated analytics data
  const { data: analytics, error } = await supabase.rpc("get_advanced_analytics", {
    p_profile_id: user.id,
    p_filters: {}
  });

  if (error) {
    console.error("Analytics Fetch Error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center animate-in fade-in duration-700">
        <div className="p-6 rounded-full bg-destructive/10 border border-destructive/20 relative">
          <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full" />
          <div className="h-16 w-16 text-destructive relative z-10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tighter text-white uppercase">Reports Intelligence Link Severed</h2>
          <p className="text-white/40 max-w-md mx-auto text-sm font-mono uppercase tracking-widest leading-relaxed">
            CRITICAL_LINK_FAILURE: The encrypted connection to the analytical node has timed out or returned an invalid status.
          </p>
        </div>
        <div className="pt-4 flex gap-4">
          <a
            href="/reports/dashboard"
            className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white/60 hover:bg-white/10 hover:text-white transition-all text-center no-underline"
          >
            Reconnect Pulse
          </a>
        </div>
      </div>
    );
  }

  return (
    <DashboardClient 
      initialData={analytics || {}} 
    />
  );
}
