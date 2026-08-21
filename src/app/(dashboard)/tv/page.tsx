import { getTvDashboard } from "@/server/services/production-tv";
import { TvDashboardView } from "@/features/production/tv-dashboard";

export default async function TvDashboardPage() {
  const data = await getTvDashboard();
  return <TvDashboardView initialData={data} />;
}
