"use client";

import React, { useState, useEffect, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, FileText, Truck, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ModuleHeader } from "@/components/ModuleHeader";
import { format } from "date-fns";

const MOVEMENT_ICONS: Record<string, React.ReactNode> = {
  outward: <ArrowUpRight size={14} />,
  inward: <ArrowDownLeft size={14} />,
  internal: <ArrowLeftRight size={14} />,
};
const STATUS_COLORS: Record<string, string> = {
  open: "bg-amber-100 text-amber-700 border-amber-200",
  closed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

interface GatePass {
  id: string; gate_pass_number: string; movement_type: string; purpose: string;
  carrier_name?: string; vehicle_number?: string; from_location: string; to_location: string;
  status: string; created_at: string; assets?: { asset_code: string; name: string };
  expected_return_date?: string;
}

export default function GatePassClient() {
  const supabase = createClient();
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    asset_id: "", movement_type: "outward", purpose: "", carrier_name: "",
    carrier_contact: "", vehicle_number: "", from_location: "", to_location: "",
    authorized_by: "", expected_return_date: "", remarks: ""
  });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [gpRes, assetRes, profileRes] = await Promise.all([
      supabase.from("asset_gate_passes").select("*, assets(asset_code, name)").order("created_at", { ascending: false }).limit(100),
      supabase.from("assets").select("id, asset_code, name").eq("status", "active").order("name"),
      supabase.from("profiles").select("id, full_name").eq("status", "active").order("full_name"),
    ]);
    setPasses(gpRes.data || []);
    setAssets(assetRes.data || []);
    setProfiles(profileRes.data || []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.asset_id || !form.purpose || !form.from_location || !form.to_location) {
      toast.error("Fill all required fields"); return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("asset_gate_passes").insert({
      ...form,
      gate_pass_number: "",
      authorized_by: form.authorized_by || null,
      expected_return_date: form.expected_return_date || null,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Gate pass created successfully");
    setOpen(false);
    setForm({ asset_id: "", movement_type: "outward", purpose: "", carrier_name: "", carrier_contact: "", vehicle_number: "", from_location: "", to_location: "", authorized_by: "", expected_return_date: "", remarks: "" });
    fetchAll();
  }

  async function closePass(id: string) {
    const { error } = await supabase.from("asset_gate_passes").update({ status: "closed", actual_return_date: new Date().toISOString().split("T")[0] }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Gate pass closed"); fetchAll(); }
  }

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <ModuleHeader title="GATE_PASS_REGISTRY" subtitle="Asset Movement Authorization" />
        <Button onClick={() => setOpen(true)} className="h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest px-5 gap-2">
          <Plus size={14} /> New Gate Pass
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Open Passes", count: passes.filter(p => p.status === "open").length, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Closed / Returned", count: passes.filter(p => p.status === "closed").length, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Passes", count: passes.length, color: "text-slate-900", bg: "bg-slate-50" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-5 border border-white`}>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
            <p className={`text-3xl font-black mt-1 ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {["Pass #", "Asset", "Type", "Purpose", "From → To", "Carrier", "Expected Return", "Status", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-slate-300 text-xs font-black uppercase">Loading...</td></tr>
            ) : passes.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-slate-300 text-xs font-black uppercase">No gate passes found</td></tr>
            ) : passes.map(pass => (
              <tr key={pass.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 font-black text-slate-900">{pass.gate_pass_number}</td>
                <td className="px-4 py-3 font-bold text-slate-700">{pass.assets?.asset_code} — {pass.assets?.name}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 font-black text-slate-600 uppercase">
                    {MOVEMENT_ICONS[pass.movement_type]} {pass.movement_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">{pass.purpose}</td>
                <td className="px-4 py-3 text-slate-600">{pass.from_location} → {pass.to_location}</td>
                <td className="px-4 py-3 text-slate-500">{pass.carrier_name || "—"}</td>
                <td className="px-4 py-3 text-slate-500">{pass.expected_return_date ? format(new Date(pass.expected_return_date), "dd MMM yyyy") : "—"}</td>
                <td className="px-4 py-3">
                  <Badge className={`text-[9px] font-black border uppercase px-2 py-0.5 ${STATUS_COLORS[pass.status]}`}>{pass.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  {pass.status === "open" && (
                    <Button size="sm" variant="ghost" onClick={() => closePass(pass.id)} className="h-7 px-2 text-[9px] font-black text-emerald-600 hover:bg-emerald-50">
                      <CheckCircle2 size={12} className="mr-1" /> Close
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border-slate-100 p-8">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <FileText size={18} /> New Gate Pass
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Asset *</Label>
              <Select value={form.asset_id} onValueChange={v => setForm(p => ({ ...p, asset_id: v }))}>
                <SelectTrigger className="rounded-xl h-10 text-xs font-bold"><SelectValue placeholder="Select asset..." /></SelectTrigger>
                <SelectContent>{assets.map(a => <SelectItem key={a.id} value={a.id} className="text-xs">{a.asset_code} — {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Movement Type *</Label>
              <Select value={form.movement_type} onValueChange={v => setForm(p => ({ ...p, movement_type: v }))}>
                <SelectTrigger className="rounded-xl h-10 text-xs font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outward" className="text-xs">Outward (Leaving premises)</SelectItem>
                  <SelectItem value="inward" className="text-xs">Inward (Returning)</SelectItem>
                  <SelectItem value="internal" className="text-xs">Internal Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Authorized By</Label>
              <Select value={form.authorized_by} onValueChange={v => setForm(p => ({ ...p, authorized_by: v }))}>
                <SelectTrigger className="rounded-xl h-10 text-xs font-bold"><SelectValue placeholder="Select approver..." /></SelectTrigger>
                <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {[
              { key: "from_location", label: "From Location *", placeholder: "e.g. Server Room A" },
              { key: "to_location", label: "To Location *", placeholder: "e.g. Client Site, Mumbai" },
              { key: "carrier_name", label: "Carrier / Person", placeholder: "Name of transporter" },
              { key: "vehicle_number", label: "Vehicle Number", placeholder: "e.g. MH-01-AB-1234" },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">{f.label}</Label>
                <Input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="rounded-xl h-10 text-xs" />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Expected Return Date</Label>
              <Input type="date" value={form.expected_return_date} onChange={e => setForm(p => ({ ...p, expected_return_date: e.target.value }))} className="rounded-xl h-10 text-xs" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Purpose *</Label>
              <Textarea value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} placeholder="Reason for movement..." className="rounded-xl text-xs min-h-[80px] resize-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 rounded-xl h-11 text-xs font-black uppercase">Cancel</Button>
            <Button onClick={handleCreate} className="flex-1 rounded-xl h-11 bg-slate-900 text-white text-xs font-black uppercase tracking-widest">
              <Truck size={14} className="mr-2" /> Issue Gate Pass
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
