"use client";

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileArchive, FileImage, FileText, FileType2, Loader2, FolderOpen, X, Maximize2, Minimize2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AttachmentRow = {
  id: string;
  file_name: string;
  file_size: number;
  content_type: string | null;
  created_at: string;
  uploaded_by_name: string;
  storage_path: string;
};

interface Props {
  attachments: AttachmentRow[];
  canView: boolean;
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

export default function AttachmentsPanel({ attachments, canView }: Props) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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

    if (isExpanded) {
      fetchSignedUrls();
    }
  }, [attachments, canView, isExpanded, supabase]);

  const filteredAttachments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return attachments.filter((item) => {
      const category = getCategory(item.file_name, item.content_type);
      const typeMatch = filterType === "all" || category === filterType;
      const queryMatch =
        !query ||
        item.file_name.toLowerCase().includes(query) ||
        (item.content_type ?? "").toLowerCase().includes(query) ||
        item.uploaded_by_name.toLowerCase().includes(query);

      return typeMatch && queryMatch;
    });
  }, [attachments, filterType, search]);

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === "#payloads") {
        setIsExpanded(true);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (!isExpanded) {
    return (
      <div id="payloads" className="scroll-mt-24 group">
        <div 
          onClick={() => setIsExpanded(true)}
          className="flex items-center justify-between cursor-pointer hover:bg-slate-50/50 p-2 rounded-2xl transition-all"
        >
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-indigo-600">Service Payloads</p>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">
              {attachments.length} {attachments.length === 1 ? 'Object' : 'Objects'} encrypted
            </p>
          </div>
          <button 
            className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"
            title="Maximize Payload Access"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="payloads" className="space-y-4 animate-in font-sans scroll-mt-24">
      <div 
        onClick={() => setIsExpanded(false)}
        className="flex items-center justify-between border-b border-slate-100 pb-3 cursor-pointer hover:bg-slate-50/30 p-2 rounded-t-2xl transition-all"
      >
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-indigo-600">Secure Object List</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-400">Payload Repository Active</p>
        </div>
        <button 
          className="h-8 w-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-all"
          title="Minimize Payload Access"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, type, or uploader"
            className="text-xs h-9 rounded-xl border-slate-200 bg-slate-50/50 flex-1"
          />
          <select
            value={filterType}
            onChange={(event) => setFilterType(event.target.value as FilterType)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">ALL_PAYLOADS</option>
            <option value="image">IMAGES</option>
            <option value="document">DOCUMENTS</option>
            <option value="archive">ARCHIVES</option>
            <option value="other">OTHER</option>
          </select>
        </div>

      {!canView ? (
        <p className="text-[11px] font-medium text-slate-400 italic">
          You can see attachment metadata. View access is limited to authorized roles.
        </p>
      ) : null}

      {filteredAttachments.length === 0 ? (
        <p className="text-center py-6 text-slate-400 font-medium">No attachments match your search.</p>
      ) : (
        <div className="max-h-80 space-y-3 overflow-y-auto pr-2 no-scrollbar">
          {filteredAttachments.map((item) => {
            const category = getCategory(item.file_name, item.content_type);
            const viewUrl = signedUrls[item.id];

            return (
              <div key={item.id} className="group rounded-2xl border border-slate-100 bg-slate-50/30 p-4 transition-all hover:bg-slate-50 hover:border-slate-200">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-white shadow-sm ring-1 ring-slate-100 group-hover:scale-110 transition-transform">
                        <TypeIcon category={category} />
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate font-bold text-slate-900 leading-tight">{item.file_name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider h-5 border-slate-200 bg-white text-slate-500">
                            {category}
                          </Badge>
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                            {formatBytes(item.file_size)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Uploaded by {item.uploaded_by_name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center self-center">
                    {canView ? (
                      viewUrl ? (
                        <Button asChild size="sm" className="h-9 px-5 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                          <a href={viewUrl} target="_blank" rel="noreferrer">
                            Open File
                          </a>
                        </Button>
                      ) : (
                        <Button disabled size="sm" variant="ghost" className="h-9 px-5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-300 bg-slate-100/50">
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Fetching
                        </Button>
                      )
                    ) : (
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 opacity-50 bg-slate-100/30 px-3 py-1.5 rounded-lg border border-slate-100">
                        Restricted
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
);
}

