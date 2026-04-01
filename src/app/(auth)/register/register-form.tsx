"use client";

import { useActionState, useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signUp, type SignUpState } from "../actions";

const initialState: SignUpState = {};

type Department = { id: string; name: string };
type Designation = { id: string; name: string; department_id?: string | null };

export function RegisterForm({
  initialDepartments = [],
  initialDesignations = [],
}: {
  initialDepartments?: Department[];
  initialDesignations?: Designation[];
}) {
  const [state, formAction, isPending] = useActionState(signUp, initialState);
  const departments = initialDepartments;
  const designations = initialDesignations;
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedDesignationId, setSelectedDesignationId] = useState("");
  const [selectedRole, setSelectedRole] = useState("end_user");

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
    if (state?.success) {
      toast.success(state.success);
    }
  }, [state]);

  return (
    <div className="w-full flex flex-col gap-10 max-w-5xl mx-auto animate-in fade-in duration-1000">
      <header className="flex items-center justify-between px-2">
        <Link href="/" className="flex items-center gap-4 group transition-transform hover:scale-105">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black text-2xl shadow-xl shadow-primary/20">
            E
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-2xl font-black tracking-tighter text-foreground">EIRMS</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
              Enterprise Management System
            </p>
          </div>
        </Link>
        <Button asChild variant="outline" className="border-border/50 text-foreground hover:bg-muted/50 rounded-xl font-bold uppercase tracking-wider text-[11px]">
          <Link href="/">Back to Portal</Link>
        </Button>
      </header>

      <main className="grid gap-10 lg:grid-cols-12 items-start">
        <section className="lg:col-span-5 space-y-6 order-2 lg:order-1">
          <div className="rounded-[2rem] border border-border/50 bg-card p-8 shadow-2xl shadow-primary/5">
            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Administrative Provisioning
            </p>
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-2xl bg-muted/30 border border-border/50 p-4 transition-all hover:border-primary/30">
                <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Unified Modules</p>
                <p className="mt-1 text-base font-black text-foreground">IT Support & ERP</p>
              </div>
              <div className="rounded-2xl bg-muted/30 border border-border/50 p-4 transition-all hover:border-primary/30">
                <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Security Protocol</p>
                <p className="mt-1 text-base font-black text-foreground">Role-Based Access</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/50 bg-card/50 p-8 space-y-4 text-xs">
            <p className="text-[11px] font-bold text-foreground/80 uppercase tracking-widest">Post-Registration Workflow</p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-muted-foreground leading-relaxed">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span>Automated system credential generation and secure transmission.</span>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground leading-relaxed">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span>Mandatory security parameter verification on initial authentication.</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="lg:col-span-7 order-1 lg:order-2">
          <Card className="border-border/50 bg-card shadow-2xl shadow-primary/5 rounded-[2.5rem] overflow-hidden">
            <div className="h-1.5 w-full bg-primary/20">
              <div className={cn("h-full bg-primary transition-all duration-1000", isPending ? "w-full" : "w-1/4")} />
            </div>
            <CardHeader className="space-y-2 text-center pt-10 pb-8">
              <CardTitle className="text-3xl font-black tracking-tight text-foreground">Create Identity</CardTitle>
              <CardDescription className="text-muted-foreground font-medium">
                Provision a new operator account within the system
              </CardDescription>
            </CardHeader>
            <form action={formAction}>
              <CardContent className="space-y-8 pb-10 px-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
                {state?.error && (
                  <div className="text-xs font-bold text-destructive text-center rounded-xl bg-destructive/10 border border-destructive/20 py-3 px-4 animate-in zoom-in-95 duration-300" role="alert">
                    {state.error}
                  </div>
                )}
                
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="fullName" className="text-foreground/80 font-bold text-[11px] uppercase tracking-wider ml-1">Legal Full Name</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      placeholder="e.g. Alexander Pierce"
                      autoComplete="name"
                      required
                      className="h-12 bg-muted/30 border-border/50 text-foreground placeholder:text-muted-foreground/30 focus:ring-primary/20 focus:border-primary transition-all rounded-xl font-medium"
                      aria-invalid={!!state?.fieldErrors?.fullName}
                      aria-describedby={state?.fieldErrors?.fullName ? "fullName-error" : undefined}
                    />
                    {state?.fieldErrors?.fullName && (
                      <p id="fullName-error" className="text-[10px] font-bold text-destructive mt-1.5 ml-1">{state.fieldErrors.fullName}</p>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="employeeId" className="text-foreground/80 font-bold text-[11px] uppercase tracking-wider ml-1">Asset ID / Employee #</Label>
                    <Input
                      id="employeeId"
                      name="employeeId"
                      placeholder="e.g. EMP-9901"
                      required
                      className="h-12 bg-muted/30 border-border/50 text-foreground placeholder:text-muted-foreground/30 focus:ring-primary/20 focus:border-primary transition-all rounded-xl font-medium"
                      aria-invalid={!!state?.fieldErrors?.employeeId}
                      aria-describedby={state?.fieldErrors?.employeeId ? "employeeId-error" : undefined}
                    />
                    {state?.fieldErrors?.employeeId && (
                      <p id="employeeId-error" className="text-[10px] font-bold text-destructive mt-1.5 ml-1">{state.fieldErrors.employeeId}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-foreground/80 font-bold text-[11px] uppercase tracking-wider ml-1">Corporate Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@organization.com"
                    autoComplete="email"
                    required
                    className="h-12 bg-muted/30 border-border/50 text-foreground placeholder:text-muted-foreground/30 focus:ring-primary/20 focus:border-primary transition-all rounded-xl font-medium"
                    aria-invalid={!!state?.fieldErrors?.email}
                    aria-describedby={state?.fieldErrors?.email ? "email-error" : undefined}
                  />
                  {state?.fieldErrors?.email && (
                    <p id="email-error" className="text-[10px] font-bold text-destructive mt-1.5 ml-1">{state.fieldErrors.email}</p>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-foreground/80 font-bold text-[11px] uppercase tracking-wider ml-1">Department</Label>
                    <Select
                      value={selectedDeptId}
                      onValueChange={(value) => setSelectedDeptId(value)}
                    >
                      <SelectTrigger className="h-12 rounded-xl border border-border/50 bg-muted/30 px-3 text-foreground font-medium">
                        <SelectValue placeholder="Assign Department" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border shadow-2xl rounded-xl">
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id} className="rounded-lg focus:bg-primary/10 focus:text-primary">{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="department_id" value={selectedDeptId} />
                    {state?.fieldErrors?.department_id && (
                      <p id="department_id-error" className="text-[10px] font-bold text-destructive mt-1.5 ml-1">{state.fieldErrors.department_id}</p>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-foreground/80 font-bold text-[11px] uppercase tracking-wider ml-1">Designation</Label>
                    <Select
                      value={selectedDesignationId}
                      onValueChange={(value) => setSelectedDesignationId(value)}
                    >
                      <SelectTrigger className="h-12 rounded-xl border border-border/50 bg-muted/30 px-3 text-foreground font-medium">
                        <SelectValue placeholder="Assign Role" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border shadow-2xl rounded-xl">
                        {designations
                          .filter((d) => !selectedDeptId || !d.department_id || d.department_id === selectedDeptId)
                          .map((d) => (
                            <SelectItem key={d.id} value={d.id} className="rounded-lg focus:bg-primary/10 focus:text-primary">{d.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="designation_id" value={selectedDesignationId} />
                    {state?.fieldErrors?.designation_id && (
                      <p id="designation_id-error" className="text-[10px] font-bold text-destructive mt-1.5 ml-1">{state.fieldErrors.designation_id}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-foreground/80 font-bold text-[11px] uppercase tracking-wider ml-1">Access Tier</Label>
                  <Select
                    value={selectedRole}
                    onValueChange={(value) => setSelectedRole(value)}
                  >
                    <SelectTrigger className="h-12 rounded-xl border border-border/50 bg-muted/30 px-3 text-foreground font-medium">
                      <SelectValue placeholder="Select Access Level" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border shadow-2xl rounded-xl">
                      <SelectItem value="end_user" className="rounded-lg focus:bg-primary/10 focus:text-primary">End User</SelectItem>
                      <SelectItem value="module_agent" className="rounded-lg focus:bg-primary/10 focus:text-primary">Module Agent</SelectItem>
                      <SelectItem value="dept_admin" className="rounded-lg focus:bg-primary/10 focus:text-primary">Dept Admin</SelectItem>
                      <SelectItem value="super_admin" className="rounded-lg focus:bg-primary/10 focus:text-primary">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="role" value={selectedRole} />
                  {state?.fieldErrors?.role && (
                    <p id="role-error" className="text-[10px] font-bold text-destructive mt-1.5 ml-1">{state.fieldErrors.role}</p>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="password" className="text-foreground/80 font-bold text-[11px] uppercase tracking-wider ml-1">Security Key</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="h-12 bg-muted/30 border-border/50 text-foreground placeholder:text-muted-foreground/30 focus:ring-primary/20 focus:border-primary transition-all rounded-xl font-medium"
                      aria-invalid={!!state?.fieldErrors?.password}
                      aria-describedby={state?.fieldErrors?.password ? "password-error" : undefined}
                    />
                    {state?.fieldErrors?.password && (
                      <p id="password-error" className="text-[10px] font-bold text-destructive mt-1.5 ml-1">{state.fieldErrors.password}</p>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="confirm" className="text-foreground/80 font-bold text-[11px] uppercase tracking-wider ml-1">Confirm Key</Label>
                    <Input
                      id="confirm"
                      name="confirm"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="h-12 bg-muted/30 border-border/50 text-foreground placeholder:text-muted-foreground/30 focus:ring-primary/20 focus:border-primary transition-all rounded-xl font-medium"
                      aria-invalid={!!state?.fieldErrors?.confirm}
                      aria-describedby={state?.fieldErrors?.confirm ? "confirm-error" : undefined}
                    />
                    {state?.fieldErrors?.confirm && (
                      <p id="confirm-error" className="text-[10px] font-bold text-destructive mt-1.5 ml-1">{state.fieldErrors.confirm}</p>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-6 pb-10 px-8">
                <Button type="submit" disabled={isPending} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black py-7 text-sm shadow-xl shadow-primary/20 active:scale-[0.98] transition-all rounded-xl uppercase tracking-widest">
                  {isPending ? (
                    <span className="flex items-center gap-3">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Provisioning...
                    </span>
                  ) : (
                    "Initialize Identity"
                  )}
                </Button>
                <p className="text-[10px] font-bold text-muted-foreground text-center uppercase tracking-widest">
                  Existing Identity?{" "}
                  <Link href="/login" className="text-primary hover:underline underline-offset-4">
                    Authenticate
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </section>
      </main>
    </div>
  );
}
