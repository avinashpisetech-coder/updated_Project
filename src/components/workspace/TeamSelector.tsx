"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Users, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getTeams, getTeamMembers } from "@/app/(dashboard)/workspace/actions";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function TeamSelector({ onTeamSelected }: { onTeamSelected: (memberIds: string[]) => void }) {
  const [open, setOpen] = React.useState(false);
  const [teams, setTeams] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    async function fetchTeams() {
      try {
        const data = await getTeams();
        setTeams(data || []);
      } catch (e) {
        console.error(e);
      }
    }
    fetchTeams();
  }, []);

  const handleSelect = async (teamId: string) => {
    setLoading(true);
    try {
      const members = await getTeamMembers(teamId);
      if (members && members.length > 0) {
        onTeamSelected(members);
        toast.success(`Added ${members.length} members from team`);
      } else {
        toast.error("This team has no members");
      }
      setOpen(false);
    } catch (e) {
      toast.error("Failed to fetch team members");
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs text-zinc-500 gap-1.5 border-dashed">
          <Users className="w-3.5 h-3.5" /> Add Team
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[250px] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input 
            placeholder="Search teams..." 
            className="border-0 focus-visible:ring-0 shadow-none h-9 w-full rounded-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <DropdownMenuLabel>Available Teams</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[200px] overflow-y-auto p-1">
          {loading ? (
            <div className="py-6 text-center text-xs text-zinc-500 italic">Fetching members...</div>
          ) : filteredTeams.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-500">No teams found.</div>
          ) : (
            filteredTeams.map((team) => (
              <DropdownMenuItem
                key={team.id}
                onClick={() => handleSelect(team.id)}
                className="flex items-center gap-2 cursor-pointer py-2"
              >
                <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                   <Users className="w-3 h-3 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{team.name}</span>
                  {team.description && <span className="text-[10px] text-zinc-400 truncate">{team.description}</span>}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
