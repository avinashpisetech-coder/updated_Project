import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { roleId, permissionId, grant } = await req.json();

  if (grant) {
    const { error } = await supabase
      .from("role_permissions")
      .upsert({ role_id: roleId, permission_id: permissionId }, { onConflict: "role_id,permission_id" });
    if (error) return new NextResponse(error.message, { status: 500 });
  } else {
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .match({ role_id: roleId, permission_id: permissionId });
    if (error) return new NextResponse(error.message, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
