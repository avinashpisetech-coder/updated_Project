"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sendPasswordResetNotification } from "@/lib/email";
import { Activity, Edit3, ShieldCheck, Mail, Hash, Building2, Briefcase, UserCircle, KeySquare, Clock, ShieldAlert, History } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

async function canCreatePasswordResetRequest(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("password_reset_requests")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .gte("requested_at", today.toISOString());

  if (error) {
    console.error("Error checking password reset limit", error);
    return false;
  }

  return (data?.length ?? 0) < 2;
}

async function recordPasswordResetRequest(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  await supabase.from("password_reset_requests").insert({ user_id: userId });
}

export async function sendPasswordResetLink() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/profile?reset=0&error=" + encodeURIComponent("Authentication required"));
    return;
  }

  const userEmail = user.email ?? "";
  if (!userEmail) {
    redirect("/profile?reset=0&error=" + encodeURIComponent("Email address not found for your account."));
    return;
  }

  const allowed = await canCreatePasswordResetRequest(supabase, user.id);
  if (!allowed) {
    redirect("/profile?reset=0&error=" + encodeURIComponent("Password reset is limited to 2 requests per day."));
    return;
  }

  await recordPasswordResetRequest(supabase, user.id);

  const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/reset-password`,
  });

  const fallbackResetUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/change-password`;

  if (error) {
    const isRateLimit = error.message.toLowerCase().includes("rate limit");
    const message = isRateLimit
      ? "Too many password reset requests from Supabase. Sent fallback reset email to your inbox."
      : "Could not send Supabase reset email, sending fallback email to your inbox.";

    await sendPasswordResetNotification(userEmail, fallbackResetUrl);
    redirect(
      "/profile?reset=1&warning=" +
        encodeURIComponent(message) +
        "&info=" +
        encodeURIComponent(`Use ${fallbackResetUrl} to reset your password immediately when signed in.`)
    );
    return;
  }

  // Still send fallback notification with direct link for reliability
  await sendPasswordResetNotification(userEmail, fallbackResetUrl);
  redirect("/profile?reset=1&info=" + encodeURIComponent("Reset link sent and fallback email delivered."));
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?:
    | Promise<{ reset?: string; error?: string; warning?: string; info?: string }>
    | { reset?: string; error?: string; warning?: string; info?: string };
}) {
  const params = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: activityLog }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, employee_id, full_name, department_id, department:departments(name), designation_id, designation:designations(name), mobile, personal_email, theme_prefs, notification_prefs, status, role, last_login_at, password_changed_at, updated_at"
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("profile_activity_log")
      .select("id, action, old_data, new_data, created_at")
      .eq("actor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const resetSent = params?.reset === "1";
  const resetError = params?.error;
  const resetWarning = params?.warning;
  const resetInfo = params?.info;

  const departmentName = Array.isArray(profile?.department)
    ? profile.department[0]?.name
    : (profile?.department as { name?: string } | null | undefined)?.name;
  const designationName = Array.isArray(profile?.designation)
    ? profile.designation[0]?.name
    : (profile?.designation as { name?: string } | null | undefined)?.name;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8 font-sans overflow-hidden">
      {/* Alerts */}
      <div className="space-y-3">
        {resetSent && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-3">
            <ShieldCheck className="h-4 w-4" /> Reset link sent to your verified inbox
          </div>
        )}
        {resetError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-destructive flex items-center gap-3">
            <ShieldAlert className="h-4 w-4" /> {decodeURIComponent(resetError).toUpperCase()}
          </div>
        )}
        {(resetWarning || resetInfo) && (
          <div className="rounded-2xl border border-border/40 bg-muted/20 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-3">
            <Activity className="h-4 w-4 opacity-40" /> {decodeURIComponent(resetWarning || resetInfo || "").toUpperCase()}
          </div>
        )}
      </div>

      {/* Profile Header */}
      <div className="flex justify-between items-end flex-wrap gap-6 pb-6 border-b border-border/40 relative">
        <div className="technical-heading-node mb-0 border-primary/40">
          <div className="flex items-center gap-2 mb-2">
             <UserCircle className="h-4 w-4 text-primary" />
             <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">User Workspace</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground leading-none m-0">
            {profile?.full_name?.split(" ")[0]} <span className="text-primary/60">{profile?.full_name?.split(" ").slice(1).join(" ")}</span>
          </h1>
          <p className="text-sm font-medium text-muted-foreground/60 mt-2">
            {designationName || "Unassigned Position"} • {departmentName || "General Department"}
          </p>
        </div>
        <div className="pb-2">
           <Button asChild className="h-10 px-6 rounded-xl font-bold uppercase tracking-wider shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white text-[11px] transition-all hover:-translate-y-0.5">
             <Link href="/profile/edit" className="flex items-center gap-2">
               <Edit3 className="h-4 w-4" /> Edit Profile
             </Link>
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Account Details */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/80 m-0">Account Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "Work Email", value: user.email, icon: Mail, sub: "Primary Contact" },
                { label: "Employee ID", value: profile?.employee_id || "Not Assigned", icon: Hash, sub: "System ID" },
                { label: "Department", value: departmentName || "General", icon: Building2, sub: "Org Unit" },
                { label: "Position", value: designationName || "Staff", icon: Briefcase, sub: "Internal Role" }
              ].map((item, idx) => (
                <div key={idx} className="technical-card p-6 space-y-4 group border-border/40 bg-card/40">
                  <div className="flex items-center justify-between opacity-40 group-hover:opacity-100 transition-opacity">
                    <item.icon className="h-4 w-4 text-primary" />
                    <p className="text-[9px] font-bold uppercase tracking-widest">{item.sub}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">{item.label}</p>
                    <p className="text-sm font-bold tracking-wide text-foreground break-all">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Security & Access */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <KeySquare className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/80 m-0">Security & Access</h2>
            </div>
            <div className="technical-card p-8 space-y-8 border-border/40 bg-card/40">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Access Level</p>
                  <Badge className="bg-primary/10 text-primary border border-primary/20 rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-widest">
                    {profile?.role?.replace("_", " ").toUpperCase() || "MEMBER"}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Account Status</p>
                  <Badge className={cn(
                    "rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-widest",
                    profile?.status === "active" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"
                  )}>
                    {profile?.status?.toUpperCase() || "OFFLINE"}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Security Update</p>
                  <form action={sendPasswordResetLink}>
                    <Button type="submit" variant="link" className="h-auto p-0 text-[11px] font-bold uppercase tracking-wider text-primary hover:text-primary/70 hover:no-underline underline underline-offset-8 decoration-primary/20 transition-all">
                      Change Password
                    </Button>
                  </form>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-border/10">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-muted/20 border border-border/40 flex items-center justify-center text-muted-foreground">
                    <Clock className="h-5 w-5 opacity-40" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Last Login</p>
                    <p className="text-[12px] font-bold tabular-nums">{profile?.last_login_at ? new Date(profile.last_login_at).toLocaleString().toUpperCase() : "---"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-muted/20 border border-border/40 flex items-center justify-center text-muted-foreground">
                    <ShieldAlert className="h-5 w-5 opacity-40" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Security Rotation</p>
                    <p className="text-[12px] font-bold tabular-nums">{profile?.password_changed_at ? new Date(profile.password_changed_at).toLocaleString().toUpperCase() : "None"}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Activity Timeline */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <History className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/80 m-0">Activity Log</h2>
          </div>
          <Card className="technical-card p-2 space-y-1 overflow-hidden border-border/40 bg-card/40">
            <div className="max-h-[800px] overflow-y-auto no-scrollbar">
              {activityLog?.length ? (
                <div className="divide-y divide-border/10">
                  {activityLog.map((activity) => (
                    <div key={activity.id} className="py-5 px-4 space-y-2 hover:bg-primary/5 transition-all rounded-xl group">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary opacity-60 group-hover:opacity-100 transition-opacity">
                          {activity.action.split("_").join(" ")}
                        </p>
                        <p className="text-[9px] font-bold tabular-nums text-muted-foreground opacity-30">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-[11px] text-foreground/70 font-medium leading-relaxed uppercase">
                        {Object.keys(activity.new_data || {}).join(", ") || "General Update"}
                      </p>
                      <p className="text-[9px] font-bold text-muted-foreground/20 text-right">
                        {new Date(activity.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-20 text-center opacity-20 flex flex-col items-center">
                  <Activity className="h-10 w-10 mb-4" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No activity recorded</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
