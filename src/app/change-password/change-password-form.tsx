"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePasswordAndProfile, type ResetPasswordState } from "@/app/(auth)/actions";

const initialState: ResetPasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAndProfile, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="text-sm text-destructive text-center" role="alert">
          {state.error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          aria-invalid={!!state?.fieldErrors?.password}
        />
        {state?.fieldErrors?.password && (
          <p className="text-sm text-destructive">{state.fieldErrors.password}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={!!state?.fieldErrors?.confirm}
        />
        {state?.fieldErrors?.confirm && (
          <p className="text-sm text-destructive">{state.fieldErrors.confirm}</p>
        )}
      </div>
      <Button type="submit" className="w-full">
        Update password
      </Button>
    </form>
  );
}
