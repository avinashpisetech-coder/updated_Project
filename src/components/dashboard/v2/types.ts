export interface DashboardStat {
  label: string;
  value: number | string;
  trend?: number;
  sparklineData?: { date: string; value: number }[];
}

export interface ChartDataPoint {
  date: string;
  [key: string]: number | string;
}

export interface GroupDataPoint {
  name: string;
  count: number;
}

export interface FeedbackData {
  positive: number;
  negative: number;
  categoryDistribution: {
    name: string;
    raised: number;
    resolved: number;
    raisedPercentage: number;
    resolvedPercentage: number;
  }[];
}

export interface TicketSummary {
  id: string;
  customer: {
    name: string;
    avatar?: string;
  };
  subject: string;
  assignedTech?: {
    name: string;
    avatar?: string;
  };
  createdAt: string;
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed' | 'escalated';
  priority: 1 | 2 | 3 | 4 | 5;
}

export interface DashboardV2Data {
  myTickets: {
    total: number;
    new: number;
    assigned: number;
    in_progress: number;
    pending: number;
    pending_user: number;
    scheduled: number;
    escalated: number;
    resolved: number;
    closed: number;
    other: number;
  };
  myPerformance: {
    resolutionRate: DashboardStat;
    pendingDelta: DashboardStat;
  };
  openTicketsOverview: ChartDataPoint[];
  monthwisePerformance: ChartDataPoint[];
  yearwisePerformance: ChartDataPoint[];
  ticketsByGroup: GroupDataPoint[];
  customerFeedback: FeedbackData;
  recentTickets: {
    data: TicketSummary[];
    totalCount: number;
    page: number;
    pageSize: number;
  };
  priority_distribution?: Record<string, number>;
  status_distribution?: Record<string, number>;
  user_stats?: {
    total: number;
    active: number;
    inactive: number;
  };
  live_users?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    role: string;
    is_live: boolean;
  }[];
  filterOptions: {
    departments: { id: string, name: string }[];
    modules: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    users: { id: string; name: string }[];
    statuses: string[];
  };
  // Compatibility fields for v1
  total_tickets?: number;
  active_load?: number;
  unassigned_count?: number;
  csat_score?: number;
  scope?: string;
}
