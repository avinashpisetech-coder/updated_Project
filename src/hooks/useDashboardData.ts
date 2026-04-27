"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardV2Data } from "@/components/dashboard/v2/types";
import { transformDashboardData } from "@/lib/dashboard-transformer";

export function useDashboardDataV2(
  filters: {
    deptId?: string | null;
    moduleId?: string | null;
    categoryId?: string | null;
    userId?: string | null;
    status?: string | null;
    start?: string | null;
    end?: string | null;
  } | null, 
  page: number = 1, 
  pageSize: number = 10
) {
  const [data, setData] = useState<DashboardV2Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      if (!filters) {
        setLoading(false);
        return;
      }

      const rpcFilters = {
        dept_ids: filters.deptId ? [filters.deptId] : [],
        module_ids: filters.moduleId ? [filters.moduleId] : [],
        category_ids: filters.categoryId ? [filters.categoryId] : [],
        user_ids: filters.userId ? [filters.userId] : [],
        statuses: filters.status ? [filters.status] : []
      };
      
      // 1. Fetch Analytics
      const { data: analytics, error: analyticsError } = await supabase.rpc("get_advanced_analytics", {
        p_profile_id: user.id,
        p_filters: rpcFilters,
        p_start_date: filters.start || null,
        p_end_date: filters.end || null
      });

      if (analyticsError) throw analyticsError;

      // 2. Fetch Tickets for the table (Using optimized RPC)
      const { data: tickets, error: ticketError } = await supabase.rpc("get_tickets_matrix_v2", {
        p_query: "",
        p_status: filters.status || "all",
        p_sort_field: "created_at",
        p_sort_dir: "desc",
        p_offset: (page - 1) * pageSize,
        p_limit: pageSize
      });

      if (ticketError) throw ticketError;

      const transformedData = transformDashboardData(analytics, tickets || [], page, pageSize);
      setData(transformedData);
    } catch (err: any) {
      setError(err);
      console.error("Dashboard Global Error:", err);
      // Attempt to log full details from Supabase if available
      if (err.message || err.code || err.details) {
        console.error("Supabase RPC 상세 오류:", {
          msg: err.message || "No message",
          code: err.code || "No code",
          details: err.details || "No details",
          hint: err.hint || "No hint",
          raw: JSON.stringify(err, null, 2)
        });
      } else {
        // Fallback for weird objects or strings
        console.warn("Unexpected Error Type:", typeof err, JSON.stringify(err));
      }
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, supabase]);

  useEffect(() => {
    fetchData();
    
    // Set up auto-refresh
    const interval = setInterval(() => {
      fetchData(true); // Silent update for live polling
    }, 60000); // Poll every 60 seconds

    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(false) };
}
