"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendUserCreationNotification } from "@/lib/email";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  force: z.boolean().optional(),
});

export type SignInState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
};

export async function signIn(
  _prev: SignInState,
  formData: FormData
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    force: formData.get("force") === "true",
  });

  if (!parsed.success) {
    const fieldErrors: SignInState["fieldErrors"] = {};
    parsed.error.issues.forEach((e) => {
      const path = e.path[0];
      if (path === "email" || path === "password") fieldErrors[path] = e.message;
    });
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("invalid login")) {
      return { error: "Invalid email or password." };
    }
    return { error: error.message };
  }

  if (authData.user && authData.session) {
    // Check for existing session
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_session_id")
      .eq("id", authData.user.id)
      .single();

    if (profile?.current_session_id && profile.current_session_id !== authData.session.id && !parsed.data.force) {
      // Conflict detected. Log out this temporary session and ask for confirmation.
      await supabase.auth.signOut();
      return { error: "ALREADY_LOGGED_IN" };
    }

    // Update the profile with the new session ID and activity timestamp
    await supabase.from("profiles").update({
      current_session_id: authData.session.id,
      last_activity_at: new Date().toISOString()
    }).eq("id", authData.user.id);
  }

  redirect("/dashboard");
}

const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export type ForgotPasswordState = {
  error?: string;
  success?: string;
  fieldErrors?: { email?: string };
};

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

export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    const fieldErrors: ForgotPasswordState["fieldErrors"] = {};
    parsed.error.issues.forEach((e) => {
      if (e.path[0] === "email") fieldErrors.email = e.message;
    });
    return { fieldErrors };
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", parsed.data.email)
    .single();

  if (profile?.id) {
    const allowed = await canCreatePasswordResetRequest(supabase, profile.id);
    if (!allowed) {
      return { error: "Password reset is limited to 2 requests per day." };
    }
    await recordPasswordResetRequest(supabase, profile.id);
  }

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/reset-password`,
  });

  if (error) {
    const message = error.message.toLowerCase().includes("rate limit")
      ? "You’ve requested too many password reset emails. Please wait a few minutes and try again."
      : error.message;
    return { error: message };
  }

  return {
    success:
      "If an account exists for this email, you will receive a password reset link.",
  };
}

const passwordPolicy = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/[0-9]/, "Include at least one number")
  .regex(
    /[@#$%^&*!_\-\s]/,
    "Include at least one special character (@#$%^&*!_-)"
  );

const signUpSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    employeeId: z.string().min(1, "Employee ID is required"),
    email: z.string().email("Enter a valid official email"),
    department_id: z.string().min(1, "Department is required"),
    designation_id: z.string().min(1, "Designation is required"),
    role: z.enum(["end_user", "module_agent", "dept_admin", "super_admin"], {
      errorMap: () => ({ message: "Select a valid role" }),
    }),
    password: passwordPolicy,
    confirm: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export type SignUpState = {
  error?: string;
  success?: string;
  fieldErrors?: {
    fullName?: string;
    employeeId?: string;
    email?: string;
    department_id?: string;
    designation_id?: string;
    role?: string;
    password?: string;
    confirm?: string;
  };
};

export async function signUp(
  _prev: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    employeeId: formData.get("employeeId"),
    email: formData.get("email"),
    department_id: formData.get("department_id"),
    designation_id: formData.get("designation_id"),
    role: formData.get("role"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    const fieldErrors: SignUpState["fieldErrors"] = {};
    parsed.error.issues.forEach((e) => {
      const path = e.path[0];
      if (
        path === "fullName" ||
        path === "employeeId" ||
        path === "email" ||
        path === "department_id" ||
        path === "designation_id" ||
        path === "role" ||
        path === "password" ||
        path === "confirm"
      ) {
        fieldErrors[path] = e.message;
      }
    });
    return { fieldErrors };
  }

  // Use admin client to create user without triggering a confirmation email
  // (avoids Supabase email rate limits; user is confirmed immediately)
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const { error: profileError } = await adminClient.from("profiles").insert({
      id: data.user.id,
      email: parsed.data.email,
      full_name: parsed.data.fullName,
      employee_id: parsed.data.employeeId,
      department_id: parsed.data.department_id,
      designation_id: parsed.data.designation_id,
      role: parsed.data.role,
      status: "active",
      force_password_change: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      return { error: `Account created but profile setup failed: ${profileError.message}` };
    }

    // Notify user via nodemailer
    try {
      await sendUserCreationNotification(parsed.data.email, parsed.data.fullName);
    } catch (emailErr) {
      console.error("Failed to send notification email:", emailErr);
    }
  }

  redirect("/dashboard");
}

const resetPasswordSchema = z
  .object({
    password: passwordPolicy,
    confirm: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export type ResetPasswordState = {
  error?: string;
  fieldErrors?: { password?: string; confirm?: string };
};

export async function updatePassword(
  _prev: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    const fieldErrors: ResetPasswordState["fieldErrors"] = {};
    parsed.error.issues.forEach((e) => {
      const path = e.path[0];
      if (path === "password" || path === "confirm") fieldErrors[path] = e.message;
    });
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

/** Updates password and clears force_password_change + sets password_changed_at on profile. Use from /change-password. */
export async function updatePasswordAndProfile(
  _prev: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    const fieldErrors: ResetPasswordState["fieldErrors"] = {};
    parsed.error.issues.forEach((e) => {
      const path = e.path[0];
      if (path === "password" || path === "confirm") fieldErrors[path] = e.message;
    });
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (updateError) return { error: updateError.message };

  await supabase
    .from("profiles")
    .update({
      force_password_change: false,
      password_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
