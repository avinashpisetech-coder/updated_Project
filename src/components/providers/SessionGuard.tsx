"use client";

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const CHECK_INTERVAL = 30 * 1000; // Check DB every 30 seconds for concurrent session

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(async (reason?: string) => {
    await supabase.auth.signOut();
    router.push(`/login${reason ? `?reason=${reason}` : ""}`);
    router.refresh();
  }, [supabase, router]);

  const checkSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Check if the current session ID matches the one in the profiles table
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("current_session_id")
      .eq("id", session.user.id)
      .single();

    if (error) {
      console.error("Session check error:", error);
      return;
    }

    if (profile?.current_session_id && profile.current_session_id !== session.id) {
      // Another session has taken over
      logout("concurrent");
    } else {
      // Update last activity in DB periodically
      await supabase.from("profiles").update({
        last_activity_at: new Date().toISOString()
      }).eq("id", session.user.id);
    }
  }, [supabase, logout]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      logout("timeout");
    }, IDLE_TIMEOUT);
  }, [logout]);

  useEffect(() => {
    // Events that count as activity
    const events = [
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "mousemove",
      "click"
    ];

    const handleEvent = () => resetIdleTimer();

    // Attach event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleEvent, { passive: true });
    });

    // Initial timer start
    resetIdleTimer();

    // Periodically check if another session logged in or session is still valid
    const intervalId = setInterval(checkSession, CHECK_INTERVAL);

    return () => {
      // Cleanup
      events.forEach((event) => {
        window.removeEventListener(event, handleEvent);
      });
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      clearInterval(intervalId);
    };
  }, [resetIdleTimer, checkSession]);

  return <>{children}</>;
}
