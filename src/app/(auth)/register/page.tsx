import { RegisterForm } from "./register-form";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const profile = await ensureProfile(supabase, user);
    if (profile && profile.role !== "super_admin" && profile.role !== "dept_admin") {
      redirect("/dashboard");
    }
  }

  // Fetch master data server-side so dropdowns work regardless of client auth state
  const [{ data: departments }, { data: designations }] = await Promise.all([
    supabase.from("departments").select("id, name").order("name"),
    supabase.from("designations").select("id, name, department_id").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-6xl flex flex-col items-center justify-center min-h-[calc(100vh-2rem)] py-8">
      <RegisterForm
        initialDepartments={departments ?? []}
        initialDesignations={designations ?? []}
      />
    </div>
  );
}

