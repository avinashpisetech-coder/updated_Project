import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">EIRMS</h1>
        <p className="text-muted-foreground">
          Enterprise Issue & Request Management System
        </p>
        <p className="text-sm text-muted-foreground max-w-md">
          One portal for all internal issues and requests — Help Desk, ERP, and
          General. Ticketing, IT Asset & Stock Management, and more.
        </p>
      </div>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    </div>
  );
}
