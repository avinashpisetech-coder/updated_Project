"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type SignInState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
};

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
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
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("invalid login")) {
      return { error: "Invalid email or password." };
    }
    return { error: error.message };
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
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/reset-password`,
  });

  if (error) {
    return { error: error.message };
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
  .regex(/[@#$%^&*!_\-\s]/, "Include at least one special character (@#$%^&*!_-)");

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
