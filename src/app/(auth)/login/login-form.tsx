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
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-1000">
      <div className="space-y-2 mb-4">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">Welcome back.</h1>
        <p className="text-slate-500 font-bold text-sm opacity-70">Enter your credentials to access the secure node.</p>
      </div>

      <Card className="border-slate-100 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[2.5rem] overflow-hidden border-none">
        <div className="h-1.5 w-full bg-slate-50">
          <div className={cn("h-full bg-blue-600 transition-all duration-1000", isPending ? "w-full" : "w-1/3")} />
        </div>
        
        <form action={formAction}>
          <CardContent className="space-y-4 pt-4 pb-2 px-10">
            {state?.error && (
              <div className="text-[10px] font-black text-red-600 text-center rounded-xl bg-red-50 border border-red-100 py-3 px-4 uppercase tracking-widest" role="alert">
                {state.error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-400 font-black text-[9px] uppercase tracking-[0.2em] ml-1">Corporate Identity</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="identity@adios.com"
                autoComplete="email"
                required
                className="h-12 bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all rounded-2xl font-bold text-sm px-6"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className="text-slate-400 font-black text-[9px] uppercase tracking-[0.2em]">Security Protocol</Label>
                <Link
                  href="/forgot-password"
                  className="text-[9px] font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-[0.2em]"
                >
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
                className="h-12 bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all rounded-2xl font-bold text-sm px-6"
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-4 pb-6 px-10">
            <Button 
              type="submit" 
              disabled={isPending}
              className="w-full bg-gradient-to-r from-red-600 to-red-900 hover:from-red-700 hover:to-red-950 text-white font-black h-12 text-xs shadow-2xl shadow-red-200 active:scale-[0.98] transition-all rounded-2xl uppercase tracking-[0.3em] border-none"
            >
              {isPending ? (
                <span className="flex items-center gap-3">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Connecting...
                </span>
              ) : (
                "Establish Connection"
              )}
            </Button>
            
            <div className="flex items-center justify-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">New Operator?</span>
              <Link href="/register" className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest underline underline-offset-4">
                Register Now
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>

      <div className="flex items-center justify-between px-2 opacity-30">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Encrypted Session</span>
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">v1.0.4</span>
      </div>
    </div>
  );
}
