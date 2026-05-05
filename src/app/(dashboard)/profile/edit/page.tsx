"use server";

import { z } from "zod";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserCircle, ShieldCheck, ArrowLeft, Save, X, Building2, Briefcase, Hash, Mail, Phone, Fingerprint, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

const profileUpdateSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  department_id: z.string().min(1, "Department is required"),
  designation_id: z.string().min(1, "Designation is required"),
  mobile: z.string().optional().or(z.literal("")),
  personal_email: z.string().email("Enter a valid personal email").optional().or(z.literal("")),
});

function formValueAsString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function updateProfile(formData: FormData) {
  const parsed = profileUpdateSchema.safeParse({
    full_name: formValueAsString(formData.get("full_name")),
    department_id: formValueAsString(formData.get("department_id")),
    designation_id: formValueAsString(formData.get("designation_id")),
    mobile: formValueAsString(formData.get("mobile")),
    personal_email: formValueAsString(formData.get("personal_email")),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();

  if (getUserError || !user) {
    throw new Error("Authentication required");
  }

  const { data: oldProfile } = await supabase
    .from("profiles")
    .select("full_name, department_id, designation_id, role, mobile, personal_email")
    .eq("id", user.id)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      department_id: parsed.data.department_id,
      designation_id: parsed.data.designation_id,
      mobile: parsed.data.mobile || null,
      personal_email: parsed.data.personal_email || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("profile_activity_log").insert({
    profile_id: user.id,
    actor_id: user.id,
    action: "update_self_profile",
    old_data: oldProfile || null,
    new_data: {
      full_name: parsed.data.full_name,
      department_id: parsed.data.department_id,
      designation_id: parsed.data.designation_id,
      mobile: parsed.data.mobile || null,
      personal_email: parsed.data.personal_email || null,
    },
    metadata: null,
  });

  redirect("/profile/edit?success=1");
}

export default async function ProfileEditPage({
  searchParams,
}: {
  searchParams: { success?: string };
}) {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) redirect("/login");

  const [profileResult, departmentsResult, designationsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "employee_id, full_name, department_id, designation_id, mobile, personal_email, role"
      )
      .eq("id", user.id)
      .single(),
    supabase.from("departments").select("id, name").order("name"),
    supabase
      .from("designations")
      .select("id, name, department_id")
      .order("name"),
  ]);

  const profile = profileResult.data;
  const departments = departmentsResult.data || [];
  const designations = designationsResult.data || [];

  if (!profile) {
    redirect("/profile");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 p-8 font-sans antialiased">
      {/* Success Alert */}
      {searchParams.success === "1" && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-[11px] font-black uppercase italic tracking-widest text-emerald-600 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
          <ShieldCheck className="h-4 w-4" /> Identity synchronization complete.
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2 opacity-60">
            <Fingerprint className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Identity Reconfiguration Matrix</p>
          </div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-foreground">
            Modify <span className="text-primary/60">Profile</span>
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest italic opacity-60">
            Internal ID: {profile?.employee_id || "ERR_NO_VECTOR"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" className="h-12 px-6 rounded-2xl font-black uppercase italic tracking-wider border-border/40 hover:bg-muted/50 text-[10px]">
            <Link href="/profile" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Return to Cockpit
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <form action={updateProfile} className="space-y-8">
            {/* Immutable Cluster */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 opacity-40">
                <ShieldCheck className="h-3 w-3" />
                <h2 className="text-[9px] font-black uppercase tracking-[0.20em]">ReadOnly System Tokens</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 grayscale opacity-60">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">Verified Email</p>
                  <Input value={user.email ?? ""} disabled className="h-11 rounded-xl bg-muted/20 border-border/40 font-bold italic text-xs cursor-not-allowed" />
                </div>
                <div className="space-y-1.5 grayscale opacity-60">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">System Role</p>
                  <Input value={profile?.role?.toUpperCase() ?? ""} disabled className="h-11 rounded-xl bg-muted/20 border-border/40 font-bold italic text-xs cursor-not-allowed" />
                </div>
              </div>
            </section>

            {/* Configurable Vector */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 opacity-60">
                <Edit3 className="h-3 w-3" />
                <h2 className="text-[9px] font-black uppercase tracking-[0.20em]">Identity Parameters</h2>
              </div>
              
              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-2">
                   Name Token <span className="text-destructive text-[8px]">*</span>
                </p>
                <div className="relative group">
                  <UserCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    name="full_name" 
                    defaultValue={profile?.full_name ?? ""} 
                    required 
                    className="h-12 pl-11 rounded-2xl bg-card/60 border-border/40 focus:border-primary/50 focus:ring-primary/20 font-black italic text-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-2">
                    Structural Node <span className="text-destructive text-[8px]">*</span>
                  </p>
                  <div className="relative group">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                    <select
                      name="department_id"
                      defaultValue={profile?.department_id ?? ""}
                      required
                      className="h-12 w-full pl-11 pr-4 rounded-2xl bg-card/60 border border-border/40 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none font-black italic text-[11px] uppercase tracking-wider appearance-none transition-all cursor-pointer"
                    >
                      <option value="" disabled>SELECT_STRUCTURAL_UNIT</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name?.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-2">
                    Rank Vector <span className="text-destructive text-[8px]">*</span>
                  </p>
                  <div className="relative group">
                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                    <select
                      name="designation_id"
                      defaultValue={profile?.designation_id ?? ""}
                      required
                      className="h-12 w-full pl-11 pr-4 rounded-2xl bg-card/60 border border-border/40 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none font-black italic text-[11px] uppercase tracking-wider appearance-none transition-all cursor-pointer"
                    >
                      <option value="" disabled>SELECT_RANK_VECTOR</option>
                      {designations.map((d) => (
                        <option key={d.id} value={d.id}>{d.name?.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">Mobile Communications</p>
                  <div className="relative group">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      name="mobile" 
                      defaultValue={profile?.mobile ?? ""} 
                      className="h-12 pl-11 rounded-2xl bg-card/60 border-border/40 focus:border-primary/50 focus:ring-primary/20 font-black italic text-sm transition-all tabular-nums"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">Personal Relay Email</p>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      name="personal_email" 
                      type="email"
                      defaultValue={profile?.personal_email ?? ""} 
                      className="h-12 pl-11 rounded-2xl bg-card/60 border-border/40 focus:border-primary/50 focus:ring-primary/20 font-black italic text-sm transition-all"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Action Matrix */}
            <div className="flex items-center gap-3 pt-6 border-t border-border/30">
              <Button type="submit" className="h-12 px-8 rounded-2xl font-black uppercase italic tracking-widest bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 flex items-center gap-2 text-[11px]">
                <Save className="h-4 w-4" /> Commit Changes
              </Button>
              <Button asChild variant="ghost" className="h-12 px-8 rounded-2xl font-black uppercase italic tracking-widest hover:bg-destructive/10 hover:text-destructive text-[11px]">
                <Link href="/profile" className="flex items-center gap-2">
                  <X className="h-4 w-4" /> Abort Reconfig
                </Link>
              </Button>
            </div>
          </form>
        </div>

        {/* Sidebar Context */}
        <div className="space-y-8">
          <div className="rounded-3xl border border-border/40 bg-muted/20 p-6 space-y-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Information Integrity</p>
              <p className="text-[11px] font-bold text-muted-foreground leading-relaxed italic uppercase">Official credentials and system roles are restricted by security protocols. Contact administrator for infrastructure-level modifications.</p>
            </div>

            <div className="space-y-4 pt-6 border-t border-border/20">
              <div className="flex items-center gap-3 opacity-60">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <p className="text-[9px] font-black uppercase tracking-widest">Multi-Factor Readiness</p>
              </div>
              <div className="flex items-center gap-3 opacity-60">
                <Fingerprint className="h-4 w-4 text-primary" />
                <p className="text-[9px] font-black uppercase tracking-widest">Biometric Linked</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
