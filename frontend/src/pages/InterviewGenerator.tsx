import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Loader2, Award, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { aiApi } from "@/lib/api";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureHistory, HistoryRecord } from "@/components/FeatureHistory";

const roles = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Scientist",
  "Product Manager",
  "UX Designer",
  "DevOps Engineer",
  "Mobile Developer",
];

const experienceLevels = ["Entry Level", "Mid Level", "Senior Level", "Lead / Staff"];

const InterviewGenerator = () => {
  const [role, setRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Mid Level");
  const [techStack, setTechStack] = useState("");
  const [results, setResults] = useState<{
    interview_questions: string[];
    model_answers: string[];
    focus_areas: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("workspace");

  const handleHistoryOpen = (record: HistoryRecord) => {
    if (record.output_data?.interview_questions) {
      setResults(record.output_data);
      if (record.input_data?.role) {
         setRole(roles.includes(record.input_data.role) ? record.input_data.role : "custom");
         if (!roles.includes(record.input_data.role)) setCustomRole(record.input_data.role);
         setExperienceLevel(record.input_data.experience || "Mid Level");
         setTechStack(record.input_data.tech_stack || "");
      }
      setActiveTab("workspace");
      toast.success("Loaded from archives.");
    } else {
      toast.error("Archive missing output data.");
    }
  };

  const handleGenerate = async () => {
    const selectedRole = role === "custom" ? customRole : role;
    if (!selectedRole) return;
    setLoading(true);
    try {
      const response = await aiApi.generateInterviewPrep(selectedRole, experienceLevel, techStack);
      if (response.status === "error") throw new Error(response.error || response.message);
      setResults(response.data);
      toast.success("Interview prep generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate interview prep");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold mb-1">Interview Prep Coach</h1>
              <p className="text-muted-foreground text-lg">Master your upcoming interview with expert role-specific questions and model answers.</p>
            </div>
            <TabsList className="grid w-full sm:max-w-[240px] grid-cols-2">
              <TabsTrigger value="workspace">Workspace</TabsTrigger>
              <TabsTrigger value="history">Archives</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="workspace" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="glass-card">
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground ml-1">Target Role</label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="bg-background/60 border-border/60">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                    <SelectItem value="custom">Custom Role...</SelectItem>
                  </SelectContent>
                </Select>
                {role === "custom" && (
                  <Input
                    placeholder="Enter job role..."
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    className="bg-background/60 border-border/60 mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground ml-1">Experience Level</label>
                <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                  <SelectTrigger className="bg-background/60 border-border/60">
                    <SelectValue placeholder="Experience" />
                  </SelectTrigger>
                  <SelectContent>
                    {experienceLevels.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 lg:col-span-1">
                <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground ml-1">Tech Stack (Optional)</label>
                <Input
                  placeholder="e.g. React, Docker, Python"
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                  className="bg-background/60 border-border/60"
                />
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={(!role || (role === "custom" && !customRole.trim())) || loading}
              className="gradient-primary text-primary-foreground border-0 px-10 h-12 text-lg font-medium"
            >
              {loading ? <Loader2 className="h-5 w-5 mr-3 animate-spin" /> : <MessageSquare className="h-5 w-5 mr-3" />}
              {loading ? "Generating Insights..." : "Build Study Material"}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="glass-card">
              <CardHeader className="pb-3 border-b border-border/10 mb-4">
                <CardTitle className="font-heading text-xl flex items-center gap-2">
                  <Award className="h-6 w-6 text-accent" />
                  Core Focus Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {results.focus_areas.map((area, i) => (
                    <Badge key={i} variant="outline" className="text-sm py-1.5 px-3 bg-accent/5 border-accent/20 text-accent font-medium">
                      {area}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h2 className="font-heading font-semibold text-2xl flex items-center gap-3">
                <Terminal className="h-6 w-6 text-primary" /> 
                Curated Interview Questions
              </h2>
              {results.interview_questions.map((q, i) => (
                <Card key={i} className="glass-card hover:border-primary/30 transition-all border-l-4 border-l-primary/40">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <span className="font-heading font-bold text-primary-foreground/40 text-3xl shrink-0 -mt-2">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="space-y-3">
                        <p className="text-card-foreground font-semibold text-lg leading-snug">{q}</p>
                        <div className="bg-secondary/30 p-4 rounded-xl border border-secondary/50">
                          <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Model Answer Guide</p>
                          <p className="text-sm text-muted-foreground italic leading-relaxed">
                            {results.model_answers[i] || "Comprehensive answer coming soon."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
          </TabsContent>
          <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <FeatureHistory 
               featureName="interview-prep" 
               onOpenRecord={handleHistoryOpen}
             />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default InterviewGenerator;
