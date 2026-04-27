import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  TODO: { label: "To Do", className: "bg-zinc-200 text-zinc-800 hover:bg-zinc-300" },
  IN_PROGRESS: { label: "In Progress", className: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
  COMPLETE: { label: "Complete", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.TODO;
  return (
    <Badge className={`font-medium border-none ${config.className}`}>
      {config.label}
    </Badge>
  );
}
