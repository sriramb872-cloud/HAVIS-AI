import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Lightbulb, FileText, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { aiApi } from "@/lib/api";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureHistory, HistoryRecord } from "@/components/FeatureHistory";

const SmartNotes = () => {
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<{
    summary: string;
    key_points: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("workspace");

  const handleHistoryOpen = (record: HistoryRecord) => {
    if (record.output_data?.summary) {
      setResults(record.output_data);
      if (record.input_data?.content) setNotes(record.input_data.content);
      setActiveTab("workspace");
      toast.success("Loaded from archives.");
    } else {
      toast.error("Archive missing output data.");
    }
  };

  const handleGenerate = async () => {
    // Phase 4: Basic Input Validation
    if (!file && (!notes.trim() || notes.trim().length < 5)) {
      toast.error("Please provide at least 5 characters of content for analysis.");
      return;
    }

    setLoading(true);
    try {
      const response = await aiApi.assistant("smart-notes", notes, file);
      
      if (response.status === "error") {
        throw new Error(response.error || response.message || "Failed to generate insights");
      }
      
      setResults(response.data);
      toast.success("Study insights generated!");
    } catch (e: any) {
      console.error("Smart Notes Error:", e);
      toast.error(e.message || "AI Service is temporarily busy. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold mb-1">Smart Notes Engine</h1>
              <p className="text-muted-foreground text-lg">Paste your study material and get intelligent, proportional summaries and key points.</p>
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
                placeholder="Paste your study notes or content here..."
                className="min-h-[200px] resize-none bg-background/60 border-border/60 text-base"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              
              <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-lg border border-border/50">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-2 shrink-0">Or Upload Source:</span>
                <Input 
                  type="file" 
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFile(f);
                  }}
                  className="bg-card w-full cursor-pointer h-10 file:font-semibold file:text-primary file:bg-primary/10 file:rounded-md file:border-0 hover:file:bg-primary/20 transition-all border-border/60"
                />
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={(!notes.trim() && !file) || loading}
              className="gradient-primary text-primary-foreground border-0 px-8 h-12 text-lg"
            >
              {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <BookOpen className="h-5 w-5 mr-2" />}
              {loading ? "Analyzing..." : "Generate Insights"}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-heading text-xl flex items-center gap-2">
                  <FileText className="h-6 w-6 text-primary" />
                  Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-lg">
                  {results.summary}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-3 border-b border-border/10 mb-3">
                <CardTitle className="font-heading text-xl flex items-center gap-2">
                  <Lightbulb className="h-6 w-6 text-accent" />
                  Key Takeaways
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {results.key_points.map((point, i) => (
                    <div key={i} className="flex gap-3 text-base text-muted-foreground group">
                      <Badge variant="secondary" className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs p-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {i + 1}
                      </Badge>
                      <span className="leading-tight">{point}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
          </TabsContent>
          <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <FeatureHistory 
               featureName="smart-notes" 
               onOpenRecord={handleHistoryOpen}
             />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SmartNotes;
