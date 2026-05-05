"use client";

import { useTaskRealtime } from "@/hooks/useTaskRealtime";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { addTaskComment } from "@/app/(dashboard)/workspace/actions";
import { 
  Send, ChevronDown, 
  ThumbsUp, SmilePlus, Paperclip, FileIcon
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadTaskAttachment, getTaskAttachments } from "@/app/(dashboard)/workspace/actions";

export function ActivityPanel({ taskId }: { taskId: string }) {
  const { comments, setComments, taskStatus } = useTaskRealtime(taskId);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const supabase = createClient();

  // Fetch all profiles for mentions and get attachments
  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .then(({ data }) => {
        if (data) {
          setUsers(data);
        }
      });
    getTaskAttachments(taskId).then(setAttachments).catch(console.error);
  }, [taskId, supabase]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      const addedComment = await addTaskComment(taskId, newComment);
      
      // Optimistically fetch profile details for the immediate update
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", userData.user?.id).single();
      
      setComments((prev: any[]) => [...prev, { ...addedComment, profiles: profile }]);
      
      setNewComment("");
      setMentionSearch(null);
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to post comment: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("file", file);
    
    setLoading(true);
    try {
      const newAttachment = await uploadTaskAttachment(taskId, formData);
      setAttachments(prev => [...prev, { ...newAttachment, profiles: { full_name: "You" } }]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewComment(val);

    // Naive mention detection: look for latest @
    const lastAtIdx = val.lastIndexOf("@");
    if (lastAtIdx !== -1) {
      const query = val.slice(lastAtIdx + 1);
      if (!query.includes(" ")) {
        setMentionSearch(query.toLowerCase());
        return;
      }
    }
    setMentionSearch(null);
  };

  const insertMention = (fullName: string) => {
    if (mentionSearch === null) return;
    const lastAtIdx = newComment.lastIndexOf("@");
    const newText = newComment.slice(0, lastAtIdx) + `@${fullName} ` + newComment.slice(lastAtIdx + mentionSearch.length + 1);
    setNewComment(newText);
    setMentionSearch(null);
  };

  // Helper to format text with blue mentions
  const renderCommentContent = (content: string) => {
    const parts = content.split(/(@\w+(?: \w+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-1 rounded">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800">
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-transparent">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Activity</h3>
      </div>
      
      {/* Scroll Area */}
      <div className="flex-1 px-6 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent hover:scrollbar-thumb-zinc-300 transition-colors">
        <div className="space-y-6 pt-4 pb-20">
          
          {/* Creation Log */}
          <div className="flex items-center justify-between text-xs text-zinc-400 pl-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-zinc-300"></div>
              <span>You created this task</span>
            </div>
            <span>Just now</span>
          </div>

          {/* Actual Comments */}
          {comments.map((comment) => (
            <div key={comment.id} className="relative group rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 shadow-sm hover:shadow-md transition-shadow">
              
              {/* Comment Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={comment.profiles?.avatar_url} />
                    <AvatarFallback className="bg-zinc-800 text-white text-xs">
                      {comment.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {comment.profiles?.full_name}
                  </span>
                  <span className="text-xs text-zinc-400 ml-2">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* Comment Body */}
              <div className="text-sm text-zinc-700 dark:text-zinc-300 pl-8 mb-4">
                {renderCommentContent(comment.content)}
              </div>
 
              {/* Comment Actions Footer */}
              <div className="flex items-center justify-between pl-8 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                <div className="flex items-center gap-3 text-zinc-400">
                  <ThumbsUp className="w-4 h-4 cursor-pointer hover:text-zinc-600 transition-colors" />
                  <SmilePlus className="w-4 h-4 cursor-pointer hover:text-zinc-600 transition-colors" />
                </div>
                <div className="text-xs font-medium text-zinc-500 hover:text-zinc-800 cursor-pointer transition-colors">
                  Reply
                </div>
              </div>
            </div>
          ))}

          {/* Attachments rendering */}
          {attachments.map((att) => (
            <div key={att.id} className="relative group rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-zinc-800 text-white text-xs">A</AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {att.profiles?.full_name}
                </span>
                <span className="text-xs text-zinc-400 ml-2">attached a file</span>
              </div>
              <div className="flex items-center gap-3 pl-8 text-sm text-zinc-700">
                <FileIcon className="w-8 h-8 text-zinc-400" />
                <div>
                  <div className="font-medium">{att.file_name}</div>
                  <div className="text-xs text-zinc-500">{(att.file_size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
            </div>
          ))}

          {comments.length === 0 && (
            <div className="text-center text-zinc-400 text-xs py-10">
              No comments yet.
            </div>
          )}
        </div>
      </div>

      {/* Input Box Footer */}
      <div className="p-4 bg-white dark:bg-zinc-950 relative">
        
        {/* Mentions Popup */}
        {mentionSearch !== null && (
          <div className="absolute bottom-full mb-2 left-4 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg overflow-hidden z-50">
            <div className="px-3 py-2 text-xs font-semibold text-zinc-500 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800">
              Mention a person
            </div>
            <div className="max-h-48 overflow-y-auto">
              {users.filter(u => u.full_name?.toLowerCase().includes(mentionSearch)).map(u => (
                <div 
                  key={u.id} 
                  className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-sm"
                  onClick={() => insertMention(u.full_name)}
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={u.avatar_url} />
                    <AvatarFallback>{u.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{u.full_name}</span>
                </div>
              ))}
              {users.filter(u => u.full_name?.toLowerCase().includes(mentionSearch)).length === 0 && (
                <div className="px-3 py-4 text-xs text-zinc-500 text-center">No users found</div>
              )}
            </div>
          </div>
        )}

        <form 
          onSubmit={handleSend} 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 focus-within:ring-1 focus-within:ring-zinc-400 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm"
        >
          
          <Input 
            placeholder="Write a comment..." 
            value={newComment}
            onChange={handleInputChange}
            disabled={loading}
            className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-xs min-h-[40px] placeholder:text-zinc-400 font-medium"
            autoComplete="off"
          />
 
          {/* Action Row */}
          <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2.5 py-0.5 bg-primary/5 rounded text-[9px] font-black uppercase tracking-widest text-primary cursor-pointer border border-primary/10">
                Comment <ChevronDown className="w-2.5 h-2.5 ml-0.5" />
              </div>
            </div>
            
            <div className="flex items-center">
              <Button 
                type="submit" 
                size="sm" 
                disabled={loading || !newComment.trim()}
                className="bg-primary hover:bg-primary/90 text-white h-6 rounded-r-none px-3 border-r border-white/10"
              >
                <Send className="h-3 w-3" />
              </Button>
              <Button 
                type="button" 
                size="sm" 
                disabled={loading || !newComment.trim()}
                className="bg-primary hover:bg-primary/90 text-white h-6 rounded-l-none px-1"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
