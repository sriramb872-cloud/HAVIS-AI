import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { analyticsApi } from "@/lib/api";
import { format } from "date-fns";
import { BarChart3, Activity, Layers, Users, ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface SummaryData {
  total_events: number;
  admin_events: number;
  history_events: number;
  distinct_users: number;
}

interface DistributionItem {
  module?: string;
  event_type?: string;
  count: number;
}

interface RecentActivity {
  id: number;
  event_type: string;
  module: string;
  user_id: string;
  created_at: string;
  metadata_preview: string;
}

const AnalyticsPage = () => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [modules, setModules] = useState<DistributionItem[]>([]);
  const [eventTypes, setEventTypes] = useState<DistributionItem[]>([]);
  const [recent, setRecent] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [sumRes, modRes, evRes, recRes] = await Promise.all([
          analyticsApi.getSummary(),
          analyticsApi.getByModule(),
          analyticsApi.getByEvent(),
          analyticsApi.getRecent()
        ]);

        setSummary(sumRes.summary);
        setModules(modRes.data);
        setEventTypes(evRes.data);
        setRecent(recRes.activity);
      } catch (err: any) {
        setError(err.message || "Failed to load analytics data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex h-[400px] flex-col items-center justify-center gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Error Loading Analytics</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button asChild variant="outline">
            <Link to="/admin">Back to Dashboard</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Insights</h1>
            <p className="text-muted-foreground">Monitor system telemetry and module engagement.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin" className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              Main Dashboard
            </Link>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(summary?.total_events || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Actions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(summary?.admin_events || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">History Logs</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(summary?.history_events || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tracked Users</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(summary?.distinct_users || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Module Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribution by Module</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modules.length > 0 ? modules.map((item) => (
                  <div key={item.module} className="flex items-center justify-between">
                    <span className="capitalize text-sm font-medium">{item.module}</span>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${(item.count / (summary?.total_events || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono">{item.count}</span>
                    </div>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No module data recorded yet.</p>}
              </div>
            </CardContent>
          </Card>

          {/* Top Event Types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Event Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eventTypes.slice(0, 5).map((item) => (
                  <div key={item.event_type} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.event_type}</span>
                    <span className="text-sm font-mono p-1 bg-muted rounded leading-none">{item.count}</span>
                  </div>
                ))}
                {eventTypes.length === 0 && <p className="text-sm text-muted-foreground">No event frequency data.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent System Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead className="text-right">Metadata Preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.length > 0 ? recent.map((event) => (
                    <TableRow key={event.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(event.created_at), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{event.event_type}</TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                          {event.module}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {event.user_id ? event.user_id.split('-')[0] + '...' : 'anonymous'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[10px] text-muted-foreground max-w-[200px] truncate">
                        {event.metadata_preview}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No activity found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
