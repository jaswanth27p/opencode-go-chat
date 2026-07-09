import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RunsChart } from "@/components/admin/runs-chart";
import { RunsByHourChart } from "@/components/admin/runs-by-hour-chart";
import { ModelUsageChart } from "@/components/admin/model-usage-chart";
import { StatusChart } from "@/components/admin/status-chart";
import { LatencyTrendChart } from "@/components/admin/latency-trend-chart";
import { MessagesChart } from "@/components/admin/messages-chart";
import { getOverviewStats } from "@/lib/admin/observability";

export default async function AdminOverviewPage() {
  const stats = await getOverviewStats();
  const errorRate =
    stats.tracesLast24h === null || stats.errorsLast24h === null
      ? null
      : stats.tracesLast24h === 0
        ? 0
        : Math.round((stats.errorsLast24h / stats.tracesLast24h) * 100);

  const kpis = [
    { label: "Conversations", value: stats.totalConversations },
    { label: "Messages", value: stats.totalMessages },
    { label: "Runs (24h)", value: stats.tracesLast24h },
    { label: "Error rate (24h)", value: errorRate, suffix: "%" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-normal">{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {kpi.value === null ? (
                <span className="text-muted-foreground text-base">Unavailable</span>
              ) : (
                `${kpi.value}${kpi.suffix ?? ""}`
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.avgLatencyMsLast24h !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">Average agent run latency (24h)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.avgLatencyMsLast24h} ms</CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
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

        <Card>
          <CardHeader>
            <CardTitle>Runs, last 24 hours by hour</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.runsByHour.length === 0 ? (
              <p className="text-muted-foreground text-sm">No runs recorded yet.</p>
            ) : (
              <RunsByHourChart data={stats.runsByHour} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top models (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.modelUsage.length === 0 ? (
              <p className="text-muted-foreground text-sm">No model usage recorded yet.</p>
            ) : (
              <ModelUsageChart data={stats.modelUsage} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Run status (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.statusCounts.success + stats.statusCounts.error === 0 ? (
              <p className="text-muted-foreground text-sm">No runs recorded yet.</p>
            ) : (
              <StatusChart data={stats.statusCounts} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average latency, last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.latencyTrend.length === 0 ? (
              <p className="text-muted-foreground text-sm">No latency data yet.</p>
            ) : (
              <LatencyTrendChart data={stats.latencyTrend} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Messages, last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.messagesByDay.length === 0 ? (
              <p className="text-muted-foreground text-sm">No messages recorded yet.</p>
            ) : (
              <MessagesChart data={stats.messagesByDay} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
