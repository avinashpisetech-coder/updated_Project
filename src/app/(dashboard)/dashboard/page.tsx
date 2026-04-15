import { createClient, getCachedUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "../../(dashboard)/reports/dashboard/DashboardClient";
import { DashboardV2 } from "@/components/dashboard/v2/DashboardV2";
import { HomeDashboard } from "@/components/dashboard/HomeDashboard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { transformDashboardData } from "@/lib/dashboard-transformer";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const user = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  const [awaitedSearchParams, { data: analytics, error }] = await Promise.all([
    searchParams,
    supabase.rpc("get_advanced_analytics", {
      p_profile_id: user.id,
      p_filters: {}
    })
  ]);

  const version = awaitedSearchParams.version as string;

  if (error) {
    console.error(`ANALYTICS_FETCH_FAILURE: [${error.code}] ${error.message} (Details: ${error.details}) - User: ${user.id}`);
    
    // Minimal error handling for HomeDashboard but full for fancy ones
    const data = {};

    if (version === "v2") return <DashboardV2 initialData={data} />;
    if (version === "v1") return <DashboardClient initialData={data} />;
    return (
      <HomeDashboard initialData={data}>
        <ActivityFeed />
      </HomeDashboard>
    );
  }

  const data = analytics ? transformDashboardData(analytics) : {};

  if (version === "v2") {
    return <DashboardV2 initialData={data} />;
  }
  
  if (version === "v1") {
    return <DashboardClient initialData={data} />;
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-6 font-sans overflow-hidden">
      <HomeDashboard initialData={data}>
        <ActivityFeed />
      </HomeDashboard>
    </div>
  );
}
