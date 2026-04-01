"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Ticket, PlusCircle, Settings2, User } from "lucide-react";
import { cn } from "@/lib/utils";

function NavItem({
  href,
  label,
  icon,
  exact = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150 whitespace-nowrap select-none",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

export function NavItems({ canManageMasters }: { canManageMasters: boolean }) {
  return (
    <nav className="flex items-center gap-0.5 bg-muted/30 border border-border/50 rounded-2xl px-1 py-1 backdrop-blur-sm">
      <NavItem href="/dashboard" label="Dashboard" icon={<LayoutDashboard size={13} />} exact />
      <NavItem href="/tickets" label="Tickets" icon={<Ticket size={13} />} />
      <NavItem href="/tickets/new" label="New Ticket" icon={<PlusCircle size={13} />} exact />
      {canManageMasters && (
        <NavItem href="/settings/masters" label="Masters" icon={<Settings2 size={13} />} />
      )}
      {canManageMasters && (
        <NavItem href="/settings/mail" label="Mail Config" icon={<PlusCircle size={13} />} />
      )}
      <NavItem href="/profile" label="Profile" icon={<User size={13} />} />
    </nav>
  );
}
