import { DashboardV2Data } from "@/components/dashboard/v2/types";
import { format } from "date-fns";

export function transformDashboardData(analytics: any, tickets: any[] = [], page: number = 1, pageSize: number = 10): DashboardV2Data {
  if (!analytics) return {} as DashboardV2Data;

  const total_tickets = Number(analytics.total_tickets) || 0;
  const statusDist = analytics.status_distribution || {};
  
  const resolved_total = (Number(statusDist.resolved) || 0) + (Number(statusDist.closed) || 0);
  const pending_total = total_tickets - resolved_total;
  
  const resRate = total_tickets > 0 ? Math.round((resolved_total / total_tickets) * 100) : 0;
  const pendDelta = total_tickets > 0 ? Math.round((pending_total / total_tickets) * 100) : 0;

  return {
    myTickets: {
      total: analytics.task_stats?.total || 0,
      new: analytics.task_stats?.todo || 0,
      assigned: analytics.task_stats?.in_progress || 0,
      in_progress: analytics.task_stats?.in_progress || 0,
      pending: 0,
      pending_user: 0,
      scheduled: 0,
      escalated: 0,
      resolved: analytics.task_stats?.completed || 0,
      closed: 0,
      other: 0
    },

    myPerformance: {
      resolutionRate: {
        label: "Raised vs Resolved",
        value: `${resRate}%`,
        trend: 12.5,
        sparklineData: []
      },
      pendingDelta: {
        label: "Raised vs Pending",
        value: `${pendDelta}%`,
        trend: -2.4,
        sparklineData: []
      }
    },
    openTicketsOverview: analytics.volume_trend?.slice(-10).map((v: any) => ({
      date: format(new Date(v.date), "dd/MM"),
      Open: v.count,
      New: Math.floor(v.count * 0.4)
    })) || [],
    monthwisePerformance: analytics.monthwise_performance?.map((m: any) => ({
      date: format(new Date(m.month), "MMM yy"),
      Raised: m.raised,
      Resolved: m.resolved
    })) || [],
    yearwisePerformance: analytics.yearwise_performance?.map((y: any) => ({
      date: y.year,
      Raised: y.raised,
      Resolved: y.resolved
    })) || [],
    ticketsByGroup: analytics.department_distribution?.map((d: any) => ({
      name: d.name,
      count: d.raised || d.count || 0
    })) || [],
    customerFeedback: {
      positive: analytics.csat_score || 0,
      negative: 100 - (analytics.csat_score || 0),
      categoryDistribution: analytics.category_distribution?.map((cat: any) => ({
        name: cat.name,
        raised: Number(cat.raised) || 0,
        resolved: Number(cat.resolved) || 0,
        raisedPercentage: Math.round(((Number(cat.raised) || 0) / (total_tickets || 1)) * 100),
        resolvedPercentage: (Number(cat.raised) || 0) > 0 
          ? Math.round(((Number(cat.resolved) || 0) / (Number(cat.raised) || 0)) * 100) 
          : 0
      })) || []
    },
    recentTickets: {
      data: tickets.map((t: any) => ({
        id: t.id.slice(0, 8),
        customer: {
          name: t.requester?.full_name || "Unknown Entity",
          avatar: t.requester?.avatar_url
        },
        subject: t.subject,
        assignedTech: t.assigned_tech ? {
          name: t.assigned_tech.full_name,
          avatar: t.assigned_tech.avatar_url
        } : undefined,
        createdAt: t.created_at,
        status: t.status.toLowerCase() as any,
        priority: (t.priority === 'low' || t.priority === '1' ? 1 : t.priority === 'medium' || t.priority === '3' ? 3 : 5) as any
      })) || [],
      totalCount: tickets.length || 0,
      page,
      pageSize
    },
    priority_distribution: analytics.priority_distribution || {},
    status_distribution: analytics.status_distribution || {},
    user_stats: analytics.user_stats || { total: 0, active: 0, inactive: 0 },
    live_users: analytics.live_users || [],
    filterOptions: {
      departments: analytics.filter_options?.departments || [],
      modules: analytics.filter_options?.modules || [],
      categories: analytics.filter_options?.categories || [],
      users: analytics.filter_options?.users || [],
      statuses: analytics.filter_options?.statuses || []
    },
    // Backward compatibility for v1
    total_tickets: total_tickets,
    active_load: Number(analytics.active_load) || 0,
    unassigned_count: Number(analytics.unassigned_count) || 0,
    csat_score: Number(analytics.csat_score) || 0,
    scope: analytics.scope || 'Standard'
  };
}
