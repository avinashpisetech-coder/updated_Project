import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm space-y-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">EIRMS</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enterprise Issue & Request Management System
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Login (Supabase Auth) will be implemented in Phase 1.
      </p>
      <Button asChild variant="outline" className="w-full">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
