import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RunsChart } from "@/components/admin/runs-chart";
import { getOverviewStats } from "@/lib/admin/observability";

export default async function AdminOverviewPage() {
  const stats = await getOverviewStats();
  const errorRate =
    stats.tracesLast24h === null || stats.errorsLast24h === null
      ? null
      : stats.tracesLast24h === 0
        ? 0
        : Math.round((stats.errorsLast24h / stats.tracesLast24h) * 100);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {stats.totalConversations === null ? (
              <span className="text-muted-foreground text-base">Unavailable</span>
            ) : (
              stats.totalConversations
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">Messages</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {stats.totalMessages === null ? (
              <span className="text-muted-foreground text-base">Unavailable</span>
            ) : (
              stats.totalMessages
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">Runs (24h)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {stats.tracesLast24h === null ? (
              <span className="text-muted-foreground text-base">Unavailable</span>
            ) : (
              stats.tracesLast24h
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">Error rate (24h)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {errorRate === null ? (
              <span className="text-muted-foreground text-base">Unavailable</span>
            ) : (
              `${errorRate}%`
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Runs, last 14 days</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.runsByDay.length === 0 ? (
            <p className="text-muted-foreground text-sm">No runs recorded yet.</p>
          ) : (
            <RunsChart data={stats.runsByDay} />
          )}
        </CardContent>
      </Card>

      {stats.avgLatencyMsLast24h !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">
              Average agent run latency (24h)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.avgLatencyMsLast24h} ms</CardContent>
        </Card>
      )}
    </div>
  );
}
