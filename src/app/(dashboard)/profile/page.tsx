import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "employee_id, full_name, designation, mobile, personal_email, theme_prefs, notification_prefs, status, role, last_login_at, password_changed_at"
    )
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
          <CardDescription>
            View and edit your profile. More fields in Phase 1.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Email</span>
            <p className="font-medium">{user.email}</p>
          </div>
          {profile && (
            <>
              <div>
                <span className="text-muted-foreground">Employee ID</span>
                <p className="font-medium">{profile.employee_id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Full name</span>
                <p className="font-medium">{profile.full_name}</p>
              </div>
              {profile.designation && (
                <div>
                  <span className="text-muted-foreground">Designation</span>
                  <p className="font-medium">{profile.designation}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Role</span>
                <p className="font-medium capitalize">{profile.role?.replace("_", " ")}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/change-password">Change password</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
