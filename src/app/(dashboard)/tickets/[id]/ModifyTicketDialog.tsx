"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateTicket, getTicketMetadataOptions } from "../actions";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Edit3, Loader2, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  ticket: {
    id: string;
    subject: string;
    description: string;
    priority: string;
    module_id?: string;
    category_id?: string;
  };
}

export default function ModifyTicketDialog({ ticket }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<{
    modules: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    priorities: { id: string; name: string }[];
  }>({ modules: [], categories: [], priorities: [] });

  const [form, setForm] = useState({
    subject: ticket.subject,
    description: ticket.description,
    priority: ticket.priority,
    module_id: ticket.module_id || "",
    category_id: ticket.category_id || "",
  });

  useEffect(() => {
    if (open) {
      getTicketMetadataOptions().then(setOptions);
    }
  }, [open]);

  const handleUpdate = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error("Subject and Description are required");
      return;
    }

    setLoading(true);
    try {
      const res = await updateTicket(ticket.id, {
        subject: form.subject,
        description: form.description,
        priority: form.priority,
        module_id: form.module_id || null,
        category_id: form.category_id || null,
      });

      if (res.success) {
        toast.success("Ticket Modified Successfully");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "Modification failed");
      }
    } catch (e) {
      toast.error("An error occurred during modification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="h-8 pr-4 pl-3 rounded-lg border-slate-200 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-950 hover:bg-slate-50 transition-all flex items-center gap-2 group"
        >
          <Edit3 className="h-3.5 w-3.5 transition-transform group-hover:rotate-12" />
          Modify Metadata
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl bg-white animate-in zoom-in-95 duration-300">
        <DialogHeader className="bg-slate-950 p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-300">Official Protocol</span>
              <DialogTitle className="text-xl font-bold tracking-tight">Modify Strategic Metadata</DialogTitle>
            </div>
            <Button 
              onClick={() => setOpen(false)} 
              variant="ghost" 
              className="h-10 w-10 rounded-xl hover:bg-white/10 text-white group"
            >
              <X className="h-5 w-5 opacity-40 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Narrative Subject (Mandatory)</label>
            <Input 
              value={form.subject}
              onChange={e => setForm({...form, subject: e.target.value})}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50/50 text-[14px] font-semibold text-slate-950 focus-visible:ring-indigo-950/10 focus-visible:bg-white transition-all shadow-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Priority Classification</label>
              <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 text-[12px] font-bold uppercase transition-all shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                  {options.priorities.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-[12px] font-bold uppercase tracking-wider">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Lifecycle Module</label>
               <Select value={form.module_id} onValueChange={v => setForm({...form, module_id: v})}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 text-[12px] font-bold uppercase transition-all shadow-none">
                  <SelectValue placeholder="Select Module" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                  {options.modules.map(m => (
                    <SelectItem key={m.id} value={m.id} className="text-[12px] font-bold uppercase tracking-wider">{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Category Reclassification</label>
            <Select value={form.category_id} onValueChange={v => setForm({...form, category_id: v})}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 text-[12px] font-bold uppercase transition-all shadow-none">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                  {options.categories.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-[12px] font-bold uppercase tracking-wider">{c.name}</SelectItem>
                  ))}
                </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Operational Description (Mandatory)</label>
            <Textarea 
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              className="min-h-[140px] rounded-[2rem] border border-slate-200 bg-slate-50/50 text-[14px] font-medium leading-relaxed p-6 focus-visible:ring-indigo-950/10 focus-visible:bg-white transition-all shadow-sm resize-none"
              required
            />
          </div>
        </div>

        <div className="p-8 pt-0 flex gap-3">
          <Button 
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1 h-12 rounded-2xl border-slate-100 text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all font-sans"
          >
            Cancel Phase
          </Button>
          <Button 
            onClick={handleUpdate}
            disabled={loading}
            className="flex-1 h-12 rounded-2xl bg-indigo-950 text-white text-[11px] font-bold uppercase tracking-widest shadow-xl shadow-indigo-950/20 hover:scale-[1.02] transition-all flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Commit Modification</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
