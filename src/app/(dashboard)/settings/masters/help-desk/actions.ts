"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addCategory(moduleId: string, name: string, description: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("ticket_categories")
    .insert({
      module_id: moduleId,
      name,
      description,
      is_active: true
    });

  if (error) {
    console.error("Failed to add category", error);
    throw new Error("Failed to add category");
  }

  revalidatePath("/settings/masters/help-desk");
  return { success: true };
}

export async function deleteCategory(categoryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Soft delete or hard delete. For now hard delete.
  const { error } = await supabase
    .from("ticket_categories")
    .delete()
    .eq("id", categoryId);

  if (error) {
    console.error("Failed to delete category", error);
    throw new Error("Failed to delete category");
  }

  revalidatePath("/settings/masters/help-desk");
  return { success: true };
}
