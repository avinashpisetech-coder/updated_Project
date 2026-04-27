"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export function UserSelector({ value, onChange, customTrigger }: { value: string[]; onChange: (val: string[]) => void; customTrigger?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [users, setUsers] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState("");
  const supabase = createClient();

  React.useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase.from("profiles").select("id, full_name, avatar_url").eq("status", "active");
      if (data) setUsers(data);
    }
    fetchUsers();
  }, [supabase]);

  const toggleUser = (userId: string) => {
    if (value.includes(userId)) {
      onChange(value.filter((id) => id !== userId));
    } else {
      onChange([...value, userId]);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {customTrigger ? customTrigger : (
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value.length > 0
              ? `${value.length} user(s) selected`
              : "Select assignees..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[300px] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input 
            placeholder="Search users..." 
            className="border-0 focus-visible:ring-0 shadow-none h-9 w-full rounded-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <DropdownMenuLabel>Team Members</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[200px] overflow-y-auto p-1">
          {filteredUsers.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-500">
              No user found.
            </div>
          ) : (
            filteredUsers.map((user) => (
              <DropdownMenuCheckboxItem
                key={user.id}
                checked={value.includes(user.id)}
                onCheckedChange={() => toggleUser(user.id)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>{user.full_name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <span>{user.full_name}</span>
              </DropdownMenuCheckboxItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
