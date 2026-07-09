import { FeatureCards } from "@/components/dashboard/feature-cards";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <FeatureCards />
    </div>
  );
}
