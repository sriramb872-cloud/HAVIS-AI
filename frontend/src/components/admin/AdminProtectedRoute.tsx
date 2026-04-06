import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { adminApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const verifyAdmin = async () => {
      if (!token) {
        setChecking(false);
        return;
      }
      try {
        await adminApi.check();
        setIsAdmin(true);
      } catch (error) {
        console.error("Admin verification failed:", error);
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    };

    if (!authLoading) {
      verifyAdmin();
    }
  }, [token, authLoading]);

  if (authLoading || checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground animate-pulse">Verifying administrative credentials...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (isAdmin === false) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-4 bg-background">
        <div className="max-w-md text-center p-8 glass-card rounded-2xl border-destructive/20 border">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold font-heading mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-8">
            You do not have the required administrative permissions to view this secure portal.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => window.location.href = "/"} variant="outline">
              Return Home
            </Button>
            <Button onClick={() => window.location.href = "mailto:support@havis.ai"} variant="secondary">
              Contact Admin
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
