"use client";

import { useState, useEffect } from "react";
import { Paperclip, FileIcon, Download, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTaskAttachments, uploadTaskAttachment } from "@/app/(dashboard)/workspace/actions";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function TaskAttachments({ taskId, disabled }: { taskId: string, disabled?: boolean }) {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    getTaskAttachments(taskId)
      .then(setAttachments)
      .finally(() => setLoading(false));
  }, [taskId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const newAtt = await uploadTaskAttachment(taskId, formData);
      setAttachments(prev => [...prev, newAtt]);
      toast.success("File uploaded successfully");
    } catch (err) {
      toast.error("Upload failed");
    }
  };

  const handleDownload = async (path: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("task_attachments")
      .download(path);
    
    if (error) {
      toast.error("Download failed");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pl-1">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <Paperclip className="w-3.5 h-3.5 text-primary" /> Sector 3: Payload Registry (Attachments)
        </label>
        {!disabled && (
          <div className="relative">
            <input type="file" id="task-detail-attach" className="hidden" onChange={handleUpload} />
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-3 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-lg border border-primary/10"
              onClick={() => document.getElementById('task-detail-attach')?.click()}
            >
              <Plus className="w-3 h-3 mr-1" /> Add Payload
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {attachments.map((att) => (
          <div key={att.id} className="group flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900 transition-all shadow-sm">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center shrink-0 shadow-sm">
                <FileIcon className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="overflow-hidden">
                <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate pr-2">{att.file_name}</div>
                <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                  {(att.file_size / 1024).toFixed(1)} KB • {new Date(att.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-zinc-400 hover:text-primary"
                onClick={() => handleDownload(att.storage_path, att.file_name)}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {attachments.length === 0 && !loading && (
          <div className="col-span-full py-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-2 opacity-40">
            <Paperclip className="w-8 h-8 text-zinc-300" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">No Payloads Registered</span>
          </div>
        )}
      </div>
    </div>
  );
}
