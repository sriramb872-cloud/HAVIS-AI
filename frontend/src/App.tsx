import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import SmartNotes from "./pages/SmartNotes";
import ResumeAnalyzer from "./pages/ResumeAnalyzer";
import InterviewGenerator from "./pages/InterviewGenerator";
import MockInterview from "./pages/MockInterview";
import AIPodcast from "./pages/AIPodcast";
import ResourceFinder from "./pages/ResourceFinder";
import TaskManager from "./pages/TaskManager";
import TestDashboard from "./pages/TestDashboard";
import AISearch from "./pages/AISearch";
import StudyPlanner from "./pages/StudyPlanner";
import JobRecommender from "./pages/JobRecommender";
import Auth from "./pages/Auth";
import AdminPage from "./pages/Admin/AdminPage";
import AnalyticsPage from "./pages/Admin/AnalyticsPage";
import NotFound from "./pages/NotFound";
import { Navigate } from "react-router-dom";
import { AdminProtectedRoute } from "./components/admin/AdminProtectedRoute";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, isLoading } = useAuth();
  if (isLoading) return null;
  if (!token) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="girls">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/notes" element={<ProtectedRoute><SmartNotes /></ProtectedRoute>} />
              <Route path="/resume" element={<ProtectedRoute><ResumeAnalyzer /></ProtectedRoute>} />
              <Route path="/interview" element={<ProtectedRoute><InterviewGenerator /></ProtectedRoute>} />
              <Route path="/mock-interview" element={<ProtectedRoute><MockInterview /></ProtectedRoute>} />
              <Route path="/podcast" element={<ProtectedRoute><AIPodcast /></ProtectedRoute>} />
              <Route path="/resources" element={<ProtectedRoute><ResourceFinder /></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute><TaskManager /></ProtectedRoute>} />
              <Route path="/tests" element={<ProtectedRoute><TestDashboard /></ProtectedRoute>} />
              <Route path="/ai-search" element={<ProtectedRoute><AISearch /></ProtectedRoute>} />
              <Route path="/study-planner" element={<ProtectedRoute><StudyPlanner /></ProtectedRoute>} />
              <Route path="/jobs" element={<ProtectedRoute><JobRecommender /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminProtectedRoute><AdminPage /></AdminProtectedRoute>} />
              <Route path="/admin/analytics" element={<AdminProtectedRoute><AnalyticsPage /></AdminProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
