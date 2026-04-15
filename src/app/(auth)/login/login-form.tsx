"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
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
import { signIn, type SignInState } from "../actions";

const initialState: SignInState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <div className="w-full flex flex-col gap-8 max-w-md animate-in fade-in duration-1000">
      <header className="flex flex-col items-center gap-4 text-center">
        <Link href="/" className="flex items-center gap-3 group transition-transform hover:scale-105">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black text-2xl shadow-xl shadow-primary/20">
            A
          </div>
          <div className="text-left">
            <p className="text-2xl font-black tracking-tighter text-foreground">ADIOS</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
              Enterprise Management System
            </p>
          </div>
        </Link>
      </header>

      <Card className="border-border/50 bg-card shadow-2xl shadow-primary/5 rounded-[2rem] overflow-hidden">
        <div className="h-1.5 w-full bg-primary/20">
          <div className={cn("h-full bg-primary transition-all duration-1000", isPending ? "w-full" : "w-1/3")} />
        </div>
        <CardHeader className="space-y-2 text-center pt-10 pb-8">
          <CardTitle className="text-3xl font-black tracking-tight text-foreground">Sign In</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            Access your secure corporate dashboard
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-6 pb-10 px-8">
            {state?.error && (
              <div className="text-xs font-bold text-destructive text-center rounded-xl bg-destructive/10 border border-destructive/20 py-3 px-4 animate-in zoom-in-95 duration-300" role="alert">
                {state.error}
              </div>
            )}
            
            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-foreground/80 font-bold text-[11px] uppercase tracking-wider ml-1">Official Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                required
                className="h-12 bg-muted/30 border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:ring-primary/20 focus:border-primary transition-all rounded-xl font-medium"
                aria-invalid={!!state?.fieldErrors?.email}
                aria-describedby={state?.fieldErrors?.email ? "email-error" : undefined}
              />
              {state?.fieldErrors?.email && (
                <p id="email-error" className="text-[10px] font-bold text-destructive mt-1.5 ml-1">{state.fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className="text-foreground/80 font-bold text-[11px] uppercase tracking-wider">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-[10px] font-bold text-primary hover:underline underline-offset-4 transition-colors uppercase tracking-wider"
                >
                  Reset?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="h-12 bg-muted/30 border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:ring-primary/20 focus:border-primary transition-all rounded-xl font-medium"
                aria-invalid={!!state?.fieldErrors?.password}
                aria-describedby={state?.fieldErrors?.password ? "password-error" : undefined}
              />
              {state?.fieldErrors?.password && (
                <p id="password-error" className="text-[10px] font-bold text-destructive mt-1.5 ml-1">{state.fieldErrors.password}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-6 pb-10 px-8">
            <Button 
              type="submit" 
              disabled={isPending}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black py-7 text-sm shadow-xl shadow-primary/20 active:scale-[0.98] transition-all rounded-xl uppercase tracking-widest"
            >
              {isPending ? (
                <span className="flex items-center gap-3">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Verifying...
                </span>
              ) : (
                "Authorize Access"
              )}
            </Button>
            
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                <span className="bg-card px-3 text-muted-foreground">New Operator?</span>
              </div>
            </div>

            <Button asChild variant="outline" className="w-full h-12 border-border/50 text-foreground hover:bg-muted/50 rounded-xl font-bold uppercase tracking-wider text-[11px]">
              <Link href="/register">
                Register Account
              </Link>
            </Button>
          </CardFooter>
        </form>
      </Card>

      <footer className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] px-4 opacity-50">
        ADIOS Secure Access Protocol &bull; v1.0.4
      </footer>
    </div>
  );
}
