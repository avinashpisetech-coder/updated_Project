"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LiveChat({ ticketId, currentUserId }: { ticketId: string; currentUserId: string }) {
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  // Fetch initial messages
  useEffect(() => {
    async function loadMessages() {
      const { data, error } = await supabase
        .from("ticket_chat_messages")
        .select(`
          *,
          sender:profiles!ticket_chat_messages_sender_id_fkey(full_name)
        `)
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (data) setMessages(data);
      setLoading(false);
    }
    loadMessages();
  }, [ticketId, supabase]);

  // Handle Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel(`ticket-chat:${ticketId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'ticket_chat_messages',
        filter: `ticket_id=eq.${ticketId}`
      }, payload => {
        // Fetch sender details for the new message
        const fetchSender = async () => {
          const { data } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", payload.new.sender_id)
            .single();
            
          setMessages(prev => [...prev, { ...payload.new, sender: data }]);
        };
        fetchSender();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, supabase]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageText = newMessage;
    setNewMessage(""); // Optimistic clear

    const { error } = await supabase.from("ticket_chat_messages").insert({
      ticket_id: ticketId,
      sender_id: currentUserId,
      content: messageText
    });

    if (error) {
      console.error(error);
      alert("Failed to send message");
    }
  };

  if (loading) return <div className="p-8 text-center text-[13px] font-medium text-slate-400">Synchronizing communications...</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 space-y-3 overflow-y-auto p-3 no-scrollbar">
        <div className="my-2 flex items-center justify-center">
          <span className="px-3 py-1 rounded-full bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 border border-slate-200">Session Initialized</span>
        </div>
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <div key={msg.id as string} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="mx-1 mb-1 text-[9px] font-black uppercase tracking-tight text-slate-400">
                {isMe ? 'Internal' : (msg.sender as { full_name: string })?.full_name || 'System User'} • {format(new Date(msg.created_at as string), 'HH:mm')}
              </span>
              <div 
                className={`px-3 py-2 rounded-xl max-w-[85%] text-xs font-medium leading-normal shadow-sm transition-all ${
                  isMe 
                    ? 'bg-indigo-600 text-white rounded-tr-none border border-indigo-500' 
                    : 'bg-white text-slate-700 rounded-tl-none border border-slate-200'
                }`}
              >
                {msg.content as string}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-slate-100 bg-slate-50/30">
        <form onSubmit={sendMessage} className="relative flex items-center gap-2">
          <Input
            type="text"
            placeholder="Log activity message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="h-9 w-full rounded-lg border-slate-200 bg-white px-3 text-xs font-medium placeholder:text-slate-400 focus-visible:ring-indigo-500/20"
          />
          <Button
            type="submit"
            disabled={!newMessage.trim()}
            className="h-9 w-9 rounded-lg p-0 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 transition-all flex items-center justify-center shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
