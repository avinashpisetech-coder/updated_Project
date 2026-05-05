import * as React from "react";

type StatusSummaryProps = {
  label: string;
  total: number;
  active: number;
  inactive: number;
};

export function StatusSummary({ label, total, active, inactive }: StatusSummaryProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground">{total}</p>
      <div className="mt-2 flex gap-2 text-xs">
        <span className="rounded-full bg-secondary px-2 py-1 text-secondary-foreground">Active: {active}</span>
        <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-1 text-destructive">Inactive: {inactive}</span>
      </div>
    </div>
  );
}
