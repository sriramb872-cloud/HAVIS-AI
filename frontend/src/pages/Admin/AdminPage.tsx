import { DashboardLayout } from "@/components/DashboardLayout";
import { AdminStats } from "@/components/admin/AdminStats";
import { AdminUserTable } from "@/components/admin/AdminUserTable";
import { adminApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, RefreshCcw, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const AdminPage = () => {
  const { 
    data: overview, 
    isLoading: overviewLoading, 
    error: overviewError, 
    refetch: refetchOverview 
  } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => adminApi.getOverview(),
  });

  const { 
    data: users, 
    isLoading: usersLoading, 
    error: usersError, 
    refetch: refetchUsers 
  } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminApi.getUsers(),
  });

  const isLoading = overviewLoading || usersLoading;
  const isError = overviewError || usersError;

  const handleRefresh = () => {
    refetchOverview();
    refetchUsers();
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-heading">Admin Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive system overview and user management.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="bg-primary/5 border-primary/20 hover:bg-primary/10">
              <Link to="/admin/analytics" className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-2 text-primary" />
                View Insights
              </Link>
            </Button>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm" 
              className="w-fit"
              disabled={isLoading}
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Error State */}
        {isError && (
          <div className="p-6 rounded-xl border border-destructive/20 bg-destructive/5 flex items-center gap-4 text-destructive">
            <AlertCircle className="h-6 w-6 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Failed to fetch administrative data</p>
              <p className="text-sm opacity-90">Please ensure you have an active session and proper permissions.</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleRefresh}>Retry</Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !isError && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground animate-pulse">Loading system metrics and users...</p>
          </div>
        )}

        {/* Stats Section */}
        {!isLoading && overview?.data && <AdminStats stats={overview.data} />}

        {/* Users Table Section */}
        {!isLoading && users?.users && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold font-heading">Registered Users</h2>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
                Showing {users.users.length} results
              </span>
            </div>
            <AdminUserTable users={users.users} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminPage;
