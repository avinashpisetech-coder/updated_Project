"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent } from "@/components/ui/card";
import { requestPasswordReset, type ForgotPasswordState } from "../actions";

const initialState: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, initialState);

  return (
    <form action={formAction}>
      <CardContent className="space-y-4">
        {state?.error && (
          <p className="text-sm text-destructive text-center" role="alert">
            {state.error}
          </p>
        )}
        {state?.success && (
          <p className="text-sm text-green-600 dark:text-green-400 text-center" role="status">
            {state.success}
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
            aria-invalid={!!state?.fieldErrors?.email}
          />
          {state?.fieldErrors?.email && (
            <p className="text-sm text-destructive">{state.fieldErrors.email}</p>
          )}
        </div>
        <Button type="submit" className="w-full">
          Send reset link
        </Button>
      </CardContent>
    </form>
  );
}
