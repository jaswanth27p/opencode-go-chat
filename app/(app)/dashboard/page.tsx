import { DashboardHero } from "@/components/dashboard/hero";
import { FeatureCards } from "@/components/dashboard/feature-cards";
import { RoadmapCards } from "@/components/dashboard/roadmap-cards";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardHero />
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Available now</h2>
        <FeatureCards />
      </div>
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">On the roadmap</h2>
        <RoadmapCards />
      </div>
    </div>
  );
}
