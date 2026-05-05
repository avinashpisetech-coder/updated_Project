"use client";

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileArchive, 
  FileImage, 
  FileText, 
  FileType2, 
  Loader2, 
  FolderOpen, 
  X, 
  Maximize2, 
  Minimize2,
  Upload,
  Paperclip
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadTicketAttachment } from "@/app/(dashboard)/tickets/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AttachmentRow = {
  id: string;
  file_name: string;
  file_size: number;
  content_type: string | null;
  created_at: string;
  uploader?: {
    full_name: string;
  };
  storage_path: string;
};

interface Props {
  ticketId?: string;
  attachments: AttachmentRow[];
  canView: boolean;
  canUpload?: boolean;
}

type FilterType = "all" | "image" | "document" | "archive" | "other";

const TICKET_ATTACHMENTS_BUCKET = process.env.NEXT_PUBLIC_TICKET_ATTACHMENTS_BUCKET ?? "ticket-attachments";

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let idx = 0;

  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }

  const precision = size >= 100 || idx === 0 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[idx]}`;
}

function getCategory(fileName: string, contentType: string | null): FilterType {
  const lowerName = fileName.toLowerCase();
  const lowerType = (contentType ?? "").toLowerCase();

  if (lowerType.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|tiff?)$/.test(lowerName)) {
    return "image";
  }

  if (
    lowerType.includes("pdf") ||
    lowerType.includes("word") ||
    lowerType.includes("excel") ||
    lowerType.includes("powerpoint") ||
    lowerType.includes("text") ||
    /\.(pdf|docx?|xlsx?|pptx?|txt|csv|rtf)$/.test(lowerName)
  ) {
    return "document";
  }

  if (lowerType.includes("zip") || lowerType.includes("rar") || /\.(zip|rar|7z|tar|gz)$/.test(lowerName)) {
    return "archive";
  }

  return "other";
}

function TypeIcon({ category }: { category: FilterType }) {
  if (category === "image") return <FileImage className="h-4 w-4 text-sky-500" aria-hidden />;
  if (category === "document") return <FileText className="h-4 w-4 text-emerald-500" aria-hidden />;
  if (category === "archive") return <FileArchive className="h-4 w-4 text-amber-500" aria-hidden />;
  return <FileType2 className="h-4 w-4 text-muted-foreground" aria-hidden />;
}

export default function AttachmentsPanel({ ticketId, attachments, canView, canUpload = true }: Props) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSignedUrls() {
      if (!canView || attachments.length === 0) return;
      
      setLoadingUrls(true);
      try {
        const paths = attachments.map(a => a.storage_path);
        const { data, error } = await supabase.storage
          .from(TICKET_ATTACHMENTS_BUCKET)
          .createSignedUrls(paths, 3600); // 1 hour

        if (data) {
          const mapping: Record<string, string> = {};
          data.forEach((item, index) => {
            if (item.signedUrl) {
              mapping[attachments[index].id] = item.signedUrl;
            }
          });
          setSignedUrls(mapping);
        }
      } catch (err) {
        console.error("Failed to fetch signed URLs:", err);
      } finally {
        setLoadingUrls(false);
      }
    }

    fetchSignedUrls();
  }, [attachments, canView, supabase]);

  const filteredAttachments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return attachments.filter((item) => {
      const category = getCategory(item.file_name, item.content_type);
      const typeMatch = filterType === "all" || category === filterType;
      const queryMatch =
        !query ||
        item.file_name.toLowerCase().includes(query) ||
        (item.content_type ?? "").toLowerCase().includes(query) ||
        (item.uploader?.full_name || "").toLowerCase().includes(query);

      return typeMatch && queryMatch;
    });
  }, [attachments, filterType, search]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ticketId) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await uploadTicketAttachment(ticketId, formData);
      toast.success("Payload uploaded successfully");
      // Page will revalidate and show new attachment
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 animate-in font-sans">
      
      {/* Upload Section */}
      {canUpload && ticketId && (
        <div className="relative group">
          <input 
            type="file" 
            id="attachment-upload" 
            className="hidden" 
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <label 
            htmlFor="attachment-upload"
            className={cn(
              "flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer transition-all hover:bg-slate-50 hover:border-primary/30 group",
              isUploading && "opacity-50 cursor-wait"
            )}
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <>
                <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform mb-2">
                  <Upload className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Inject_Payload</span>
              </>
            )}
          </label>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter payloads..."
            className="text-[10px] h-8 pl-8 rounded-lg border-slate-200 bg-slate-50/30 w-full"
          />
          <Paperclip className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-300" />
        </div>
        <select
          value={filterType}
          onChange={(event) => setFilterType(event.target.value as FilterType)}
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[9px] font-black uppercase tracking-widest text-slate-400 focus:outline-none"
        >
          <option value="all">ALL</option>
          <option value="image">IMG</option>
          <option value="document">DOC</option>
          <option value="archive">ARC</option>
        </select>
      </div>

      {!canView ? (
        <p className="text-[9px] font-bold text-slate-400 italic">
          Access Restricted
        </p>
      ) : null}

      {filteredAttachments.length === 0 ? (
        <p className="text-center py-4 text-slate-400 font-bold text-[8px] uppercase tracking-widest italic opacity-40">Void_Registry</p>
      ) : (
        <div className="max-h-[250px] overflow-y-auto overflow-x-auto pr-1 no-scrollbar border border-slate-100 rounded-xl bg-white/50 shadow-inner">
          <table className="w-full text-left border-collapse min-w-[300px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-3 py-2 text-[7px] font-black uppercase tracking-widest text-slate-400">Object</th>
                <th className="px-3 py-2 text-[7px] font-black uppercase tracking-widest text-slate-400 text-right">Size</th>
                <th className="px-3 py-2 w-14"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAttachments.map((item) => {
                const category = getCategory(item.file_name, item.content_type);
                const viewUrl = signedUrls[item.id];

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <TypeIcon category={category} />
                        <span className="truncate font-bold text-slate-600 text-[9px] leading-none max-w-[120px] sm:max-w-none" title={item.file_name}>{item.file_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-[8px] font-bold text-slate-300 tabular-nums uppercase">
                        {formatBytes(item.file_size)}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right whitespace-nowrap">
                      {canView ? (
                        viewUrl ? (
                          <a 
                            href={viewUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center justify-center h-5 px-2 rounded-md text-[7px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                          >
                            Open
                          </a>
                        ) : (
                          <Loader2 className="h-3 w-3 animate-spin text-slate-200 ml-auto" />
                        )
                      ) : (
                        <span className="text-[7px] font-bold text-slate-200">Gated</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
