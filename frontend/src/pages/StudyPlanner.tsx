import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Loader2, BookOpen, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { aiApi } from "@/lib/api";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureHistory, HistoryRecord } from "@/components/FeatureHistory";

type StudyPlanItem = {
  day: number;
  tasks: string[];
  revision: boolean;
};

type StudyPlanSubject = {
  name: string;
  units: { title: string; topics: string[] }[];
};

const StudyPlanner = () => {
  const [topics, setTopics] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [days, setDays] = useState("7");
  const [difficulty, setDifficulty] = useState("medium");
  const [plan, setPlan] = useState<StudyPlanItem[]>([]);
  const [subjects, setSubjects] = useState<StudyPlanSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("workspace");

  const handleGenerate = async () => {
    // Phase 4: Basic Input Validation
    if (!file && (!topics.trim() || topics.trim().length < 5)) {
      toast.error("Please provide at least 5 characters of study topics or upload a syllabus.");
      return;
    }

    setLoading(true);
    try {
      const response = await aiApi.assistant("study-planner", topics, file, { days, difficulty });
      
      if (response.status === "error") {
        throw new Error(response.error || response.message || "Failed to generate study plan");
      }
      
      setPlan(response.data.plan || []);
      setSubjects(response.data.subjects || []);
      toast.success("Study plan crafted!");
    } catch (e: any) {
      console.error("Study Planner Error:", e);
      toast.error(e.message || "AI Planning Service is currently busy. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryOpen = (record: HistoryRecord) => {
    if (record.output_data?.plan) {
      setPlan(record.output_data.plan);
      setSubjects(record.output_data.subjects || []);
      if (record.input_data?.topics) setTopics(record.input_data.topics);
      setActiveTab("workspace");
      toast.success("Loaded plan from archives.");
    } else {
      toast.error("Archive missing output data.");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <div>
              <h1 className="font-heading text-2xl font-bold mb-1">AI Study Planner</h1>
              <p className="text-muted-foreground">Enter your topics and let AI create a personalized study schedule.</p>
            </div>
            <TabsList className="grid w-full sm:max-w-[240px] grid-cols-2">
              <TabsTrigger value="workspace">Workspace</TabsTrigger>
              <TabsTrigger value="history">Archives</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="workspace" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="glass-card">
          <CardContent className="p-5 space-y-4">
            <div className="space-y-4">
              <Textarea
                placeholder="Paste your syllabus, topic list, or general goals here..."
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                className="min-h-[120px] resize-none bg-background/60 border-border/60"
              />
              <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-lg border border-border/50">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-2 shrink-0">Upload Syllabus:</span>
                <Input 
                  type="file" 
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFile(f);
                  }}
                  className="bg-card w-full cursor-pointer h-10 file:font-semibold file:text-primary file:bg-primary/10 file:rounded-md file:border-0 hover:file:bg-primary/20 transition-all border-border/60"
                />
              </div>
            </div>

            <div className="flex gap-3 items-end">
              <div className="w-24">
                <label className="text-sm text-muted-foreground mb-1 block font-medium">Days Limit</label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="bg-background/60 border-border/60"
                />
              </div>
              <div className="w-32">
                <label className="text-sm text-muted-foreground mb-1 block font-medium">Workload Intensity</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="bg-background/60 border-border/60">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Light</SelectItem>
                    <SelectItem value="medium">Balanced</SelectItem>
                    <SelectItem value="hard">Intense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={(!topics.trim() && !file) || loading}
                className="gradient-primary text-primary-foreground border-0 ml-auto px-6 h-10"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarDays className="h-4 w-4 mr-2" />}
                {loading ? "Planning Schedule..." : "Architect Plan"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {(plan.length > 0 || subjects.length > 0) && (
          <div className="grid md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Syllabus Overview Column */}
            <div className="space-y-4 md:col-span-1">
              <h2 className="font-heading font-bold text-xl mb-4 border-b pb-2">Structured Curriculum</h2>
              {subjects.map((sub, idx) => (
                <Card key={idx} className="glass-card bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md font-bold text-primary flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      {sub.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {sub.units.map((u, uIdx) => (
                      <div key={uIdx} className="space-y-1.5">
                        <h4 className="text-sm font-semibold text-foreground/90">{u.title}</h4>
                        <ul className="pl-4 border-l-2 border-primary/20 space-y-1">
                          {u.topics.map((t, tIdx) => (
                            <li key={tIdx} className="text-xs text-muted-foreground relative before:absolute before:content-[''] before:w-1.5 before:h-1.5 before:bg-primary/40 before:rounded-full before:-before:left-3 before:top-1.5 pl-3">
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Daily Execution Column */}
            <div className="space-y-4 md:col-span-2">
              <h2 className="font-heading font-bold text-xl mb-4 border-b pb-2 text-right">Daily Execution Protocol</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {plan.map((day, i) => (
                  <Card key={i} className={`glass-card transition-all ${day.revision ? 'border-accent/40 bg-accent/5' : 'bg-card/50'}`}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-center w-full">
                        <span className="font-heading font-black text-lg">Day {day.day}</span>
                        {day.revision && <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 text-[10px]">REVISION</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <ul className="space-y-2 mt-2">
                        {day.tasks.map((task, j) => (
                          <li key={j} className="flex gap-2 text-sm text-card-foreground/90 leading-tight items-start">
                            <BookOpen className={`h-3 w-3 mt-0.5 shrink-0 ${day.revision ? 'text-accent/60' : 'text-primary/60'}`} />
                            {task}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
        </TabsContent>
        <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <FeatureHistory 
               featureName="study-planner" 
               onOpenRecord={handleHistoryOpen}
             />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default StudyPlanner;
