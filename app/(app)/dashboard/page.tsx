import { ProfileOverview } from "@/components/dashboard/profile-overview";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <ProfileOverview />
    </div>
  );
}
