import { DashboardLayout } from "@/components/DashboardLayout";
import {
  BookOpen,
  FileText,
  MessageSquare,
  Podcast,
  Search,
  CheckSquare,
  BarChart3,
  ArrowRight,
  Sparkles,
  Mic,
  Bot,
  CalendarDays,
  Database,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const tools = [
  { title: "Smart Notes", desc: "Intelligent proportional summaries & key takeaways", icon: BookOpen, url: "/notes", color: "bg-primary/10 text-primary" },
  { title: "Resume Analyzer", desc: "Detailed ATS scoring & matching suggestions", icon: FileText, url: "/resume", color: "bg-success/10 text-success" },
  { title: "Interview Prep", desc: "Expert questions, model answers & focus areas", icon: MessageSquare, url: "/interview", color: "bg-info/10 text-info" },
  { title: "Mock Interview", desc: "Practice with AI & get real-time feedback", icon: Mic, url: "/mock-interview", color: "bg-warning/10 text-warning" },
  { title: "AI Podcast", desc: "Create narration-ready conversation scripts", icon: Podcast, url: "/podcast", color: "bg-accent/10 text-accent" },
  { title: "Resource Finder", desc: "Discover accurate documentation & learning paths", icon: Search, url: "/resources", color: "bg-destructive/10 text-destructive" },
  { title: "Task Manager", desc: "AI-prioritized task management", icon: CheckSquare, url: "/tasks", color: "bg-warning/10 text-warning" },
  { title: "Test Dashboard", desc: "AI quizzes & performance tracking", icon: BarChart3, url: "/tests", color: "bg-primary/10 text-primary" },
  { title: "AI Search", desc: "Structured, deep-answer knowledge engine", icon: Bot, url: "/ai-search", color: "bg-info/10 text-info" },
  { title: "Study Planner", desc: "AI-generated personalized study schedules", icon: CalendarDays, url: "/study-planner", color: "bg-success/10 text-success" },
];

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="relative overflow-hidden rounded-2xl gradient-primary p-8 md:p-12">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium text-primary-foreground/80 lowercase tracking-wider">AI-Powered Hub</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary-foreground mb-4 font-heading">
              HAVIS AI
            </h1>
            <p className="text-primary-foreground/75 max-w-lg text-lg leading-relaxed">
              Elevate your cognitive workflow and career trajectory with state-of-the-art intelligent tools.
            </p>
          </div>
          <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-primary-foreground/5 blur-2xl" />
          <div className="absolute -right-5 -bottom-10 w-40 h-40 rounded-full bg-accent/20 blur-xl" />
        </div>

        <div>
          <h2 className="font-heading text-xl font-semibold mb-4">Your AI Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <Card
                key={tool.title}
                className="group cursor-pointer glass-card hover:shadow-md hover:border-primary/20 transition-all duration-200"
                onClick={() => navigate(tool.url)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-xl ${tool.color} mb-4`}>
                      <tool.icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="font-heading font-semibold text-card-foreground mb-1">{tool.title}</h3>
                  <p className="text-sm text-muted-foreground">{tool.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
