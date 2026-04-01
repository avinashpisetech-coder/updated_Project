"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addErpModule(name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("erp_modules")
    .insert({ name })
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/settings/masters/erp");
  return data;
}

export async function deleteErpModule(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("erp_modules")
    .delete()
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/settings/masters/erp");
}

export async function addErpSubModule(erpModuleId: string, name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("erp_sub_modules")
    .insert({ erp_module_id: erpModuleId, name })
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/settings/masters/erp");
  return data;
}

export async function deleteErpSubModule(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("erp_sub_modules")
    .delete()
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/settings/masters/erp");
}
