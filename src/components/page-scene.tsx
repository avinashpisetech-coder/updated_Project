"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { ThemeOrnaments } from "@/components/theme-ornaments";

type Section = {
  key: "dashboard" | "tickets" | "masters" | "profile" | "auth" | "default";
};

function detectSection(pathname: string): Section {
  if (pathname.startsWith("/tickets")) {
    return { key: "tickets" };
  }

  if (pathname.startsWith("/settings/masters")) {
    return { key: "masters" };
  }

  if (pathname.startsWith("/profile") || pathname.startsWith("/change-password")) {
    return { key: "profile" };
  }

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) {
    return { key: "auth" };
  }

  if (pathname.startsWith("/dashboard")) {
    return { key: "dashboard" };
  }

  return { key: "default" };
}

export function PageScene({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const section = useMemo(() => detectSection(pathname), [pathname]);

  return (
    <div className="relative">
      <ThemeOrnaments variant={section.key} />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
