"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveCustomReport(report: {
  name: string;
  chart_type: string;
  config: any;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("custom_reports")
    .upsert({
      user_id: user.id,
      ...report,
      updated_at: new Date().toISOString()
    });

  if (error) throw new Error(error.message);

  revalidatePath("/reports/dashboard");
  return { success: true };
}

export async function deleteCustomReport(reportId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("custom_reports")
    .delete()
    .match({ id: reportId, user_id: user.id });

  if (error) throw new Error(error.message);

  revalidatePath("/reports/dashboard");
  return { success: true };
}
