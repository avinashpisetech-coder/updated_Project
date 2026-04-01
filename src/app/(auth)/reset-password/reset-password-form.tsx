import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type ResetPasswordState = {
  error?: string;
  success?: string;
  fieldErrors?: { password?: string; confirm?: string };
};

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();
  const [state, setState] = useState<ResetPasswordState>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function confirmResetSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data?.session) {
        setState({ error: "Unable to verify reset token. Please request a new reset link." });
      }
    }

    confirmResetSession();
  }, [supabase]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = formData.get("password")?.toString() ?? "";
    const confirm = formData.get("confirm")?.toString() ?? "";

    if (password.length < 10) {
      setState({ fieldErrors: { password: "Password must be at least 10 characters" } });
      return;
    }
    if (password !== confirm) {
      setState({ fieldErrors: { confirm: "Passwords do not match" } });
      return;
    }

    setLoading(true);
    setState({});

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setState({ error: error.message });
      return;
    }

    setState({ success: "Password updated successfully. Redirecting to login..." });
    setTimeout(() => router.push("/login"), 1500);
  };

  return (
    <div className="w-full flex flex-col gap-8 max-w-md animate-in fade-in duration-1000">
      <header className="flex flex-col items-center gap-4 text-center">
        <Link href="/" className="flex items-center gap-3 group transition-transform hover:scale-105">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black text-2xl shadow-xl shadow-primary/20">
            E
          </div>
          <div className="text-left">
            <p className="text-2xl font-black tracking-tighter text-foreground">EIRMS</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
              Enterprise Management System
            </p>
          </div>
        </Link>
      </header>

      <Card className="border-border/50 bg-card shadow-2xl shadow-primary/5 rounded-[2rem] overflow-hidden">
        <div className="h-1.5 w-full bg-primary/20">
          <div className={cn("h-full bg-primary transition-all duration-1000", loading ? "w-full" : "w-1/2")} />
        </div>
        <CardHeader className="space-y-2 text-center pt-10 pb-8">
          <CardTitle className="text-3xl font-black tracking-tight text-foreground">Update Password</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            Define a new security credential for your account
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-6 pb-10 px-8">
            {state?.error && (
              <div className="text-xs font-bold text-destructive text-center rounded-xl bg-destructive/10 border border-destructive/20 py-3 px-4 animate-in zoom-in-95 duration-300" role="alert">
                {state.error}
              </div>
            )}
            {state?.success && (
              <div className="text-xs font-bold text-primary text-center rounded-xl bg-primary/10 border border-primary/20 py-3 px-4 animate-in zoom-in-95 duration-300" role="status">
                {state.success}
              </div>
            )}
            
            <div className="space-y-2.5">
              <Label htmlFor="password" title="At least 10 characters, uppercase, lowercase, number, special character" className="text-foreground/80 font-bold text-[11px] uppercase tracking-wider ml-1">New Security Key</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                className="h-12 bg-muted/30 border-border/50 text-foreground placeholder:text-muted-foreground/30 focus:ring-primary/20 focus:border-primary transition-all rounded-xl font-medium"
                aria-invalid={!!state?.fieldErrors?.password}
              />
              {state?.fieldErrors?.password && (
                <p className="text-[10px] font-bold text-destructive mt-1.5 ml-1">{state.fieldErrors.password}</p>
              )}
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="confirm" className="text-foreground/80 font-bold text-[11px] uppercase tracking-wider ml-1">Confirm Security Key</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                className="h-12 bg-muted/30 border-border/50 text-foreground placeholder:text-muted-foreground/30 focus:ring-primary/20 focus:border-primary transition-all rounded-xl font-medium"
                aria-invalid={!!state?.fieldErrors?.confirm}
              />
              {state?.fieldErrors?.confirm && (
                <p className="text-[10px] font-bold text-destructive mt-1.5 ml-1">{state.fieldErrors.confirm}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="pb-10 px-8">
            <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black py-7 text-sm shadow-xl shadow-primary/20 active:scale-[0.98] transition-all rounded-xl uppercase tracking-widest"
              >
              {loading ? (
                <span className="flex items-center gap-3">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Updating...
                </span>
              ) : (
                "Commit Changes"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <footer className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] px-4 opacity-50">
        Secure Credential Update Protocol &bull; v1.0.4
      </footer>
    </div>
  );
}
