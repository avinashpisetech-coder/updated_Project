"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addSoftwareSystem(
  scope: "erp" | "it",
  name: string,
  code: string,
  description: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("software_systems")
    .insert({
      scope,
      name,
      code: code || null,
      description: description || null,
      status: "active",
    })
    .select("id, name, code, description, status")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings/masters/erp");
  revalidatePath("/settings/masters/help-desk");
  revalidatePath("/tickets/new");
  return data;
}

export async function deleteSoftwareSystem(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("software_systems").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings/masters/erp");
  revalidatePath("/settings/masters/help-desk");
  revalidatePath("/tickets/new");
}