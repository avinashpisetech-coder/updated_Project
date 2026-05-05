"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  Search,
  Ticket,
  LayoutDashboard,
  Package,
  Plus,
  Command as CommandIcon,
  BarChart3,
  CheckSquare
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Main Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/tickets"))}>
              <Ticket className="mr-2 h-4 w-4" />
              <span>Service Tickets</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/workspace"))}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Workspaces</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/workspace/workload"))}>
              <BarChart3 className="mr-2 h-4 w-4" />
              <span>Workload Intelligence</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/workspace/tasks"))}>
              <CheckSquare className="mr-2 h-4 w-4" />
              <span>Task Registry</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => runCommand(() => router.push("/tickets/new"))}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Create New Ticket</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/workspace"))}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Create New Workspace</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem onSelect={() => runCommand(() => router.push("/profile"))}>
              <User className="mr-2 h-4 w-4" />
              <span>User Profile</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/settings/masters"))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>System Masters</span>
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
