import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink, Github, BookOpen, Loader2, PlayCircle, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { aiApi } from "@/lib/api";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureHistory, HistoryRecord } from "@/components/FeatureHistory";

type Resource = {
  title: string;
  url: string;
  type: string;
  description: string;
};

const typeIcons: Record<string, React.ReactNode> = {
  article: <BookOpen className="h-5 w-5" />,
  repo: <Github className="h-5 w-5" />,
  video: <PlayCircle className="h-5 w-5" />,
  course: <Award className="h-5 w-5" />,
  documentation: <Globe className="h-5 w-5" />,
};

import { Award } from "lucide-react";

const ResourceFinder = () => {
  const [query, setQuery] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("workspace");

  const handleHistoryOpen = (record: HistoryRecord) => {
    if (record.output_data?.resources) {
      setResources(record.output_data.resources);
      if (record.input_data?.content) setQuery(record.input_data.content);
      setActiveTab("workspace");
      toast.success("Loaded from archives.");
    } else {
      toast.error("Archive missing output data.");
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await aiApi.assistant("resource-finder", query);
      if (response.status === "error") throw new Error(response.error || response.message);
      
      setResources(response.data.resources || []);
      if (response.data.resources?.length === 0) {
        toast.info("No specific resources found for this query.");
      } else {
        toast.success(`Found ${response.data.resources.length} high-quality resources!`);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to find resources");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <div className="text-center md:text-left">
              <h1 className="font-heading text-4xl font-bold mb-2 tracking-tight">Resource Explorer</h1>
              <p className="text-muted-foreground text-lg max-w-2xl">Discover hand-picked, accurate learning paths, documentation, and expert material.</p>
            </div>
            <TabsList className="grid w-full sm:max-w-[240px] grid-cols-2">
              <TabsTrigger value="workspace">Workspace</TabsTrigger>
              <TabsTrigger value="history">Archives</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="workspace" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="glass-card shadow-lg border-primary/10 overflow-hidden">
          <CardContent className="p-1">
            <div className="flex flex-col sm:flex-row gap-0 group">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="What do you want to learn today? (e.g., Python Fast API, Docker for beginners)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="bg-transparent border-0 h-16 pl-14 text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={!query.trim() || loading}
                className="gradient-primary text-primary-foreground border-0 h-16 px-10 rounded-none rounded-r-lg font-bold text-lg shrink-0"
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Search Resources"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {resources.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {resources.map((r, i) => (
              <a 
                key={i} 
                href={r.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block group"
              >
                <Card className="glass-card hover:border-primary/40 transition-all duration-300 hover:shadow-xl group-hover:-translate-y-1 border border-border/50">
                  <CardContent className="p-6 flex flex-col md:flex-row items-center md:items-start gap-6">
                    <div className="p-4 rounded-2xl bg-secondary/50 group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300 shrink-0">
                      {typeIcons[r.type.toLowerCase()] || <BookOpen className="h-6 w-6" />}
                    </div>
                    <div className="flex-1 min-w-0 text-center md:text-left space-y-2">
                       <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <h3 className="font-heading font-bold text-xl text-card-foreground group-hover:text-primary transition-colors">{r.title}</h3>
                        <Badge variant="secondary" className="w-fit mx-auto md:mx-0 uppercase text-[10px] tracking-widest font-black py-1 px-2 border-primary/20 text-primary-foreground/70 bg-primary/20">
                          {r.type}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm line-clamp-2 md:line-clamp-none max-w-3xl leading-relaxed">{r.description}</p>
                      <div className="flex items-center gap-1 text-primary text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        Visit Resource <ExternalLink className="h-3 w-3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        )}
          </TabsContent>
          <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <FeatureHistory 
               featureName="resource-finder" 
               onOpenRecord={handleHistoryOpen}
             />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ResourceFinder;
