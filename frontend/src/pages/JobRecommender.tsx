import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, Loader2, TrendingUp, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Job = {
  title: string;
  matchScore: number;
  description: string;
  requiredSkills: string[];
  salaryRange: string;
  growthOutlook: string;
};

const JobRecommender = () => {
  const [skills, setSkills] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  const handleRecommend = async () => {
    if (!skills.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { type: "job-recommender", content: skills },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setJobs(data.result.jobs || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to get recommendations");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold mb-1">AI Job Recommender</h1>
          <p className="text-muted-foreground">Enter your skills and experience — AI will recommend matching careers.</p>
        </div>

        <Card className="glass-card">
          <CardContent className="p-5 space-y-4">
            <Textarea
              placeholder="Describe your skills, experience, and interests (e.g., Python, machine learning, 2 years of data analysis, interested in AI)..."
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="min-h-[150px] resize-none bg-background/60 border-border/60"
            />
            <Button
              onClick={handleRecommend}
              disabled={!skills.trim() || loading}
              className="gradient-primary text-primary-foreground border-0"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Briefcase className="h-4 w-4 mr-2" />}
              {loading ? "Analyzing..." : "Get Recommendations"}
            </Button>
          </CardContent>
        </Card>

        {jobs.length > 0 && (
          <div className="space-y-4">
            {jobs.map((job, i) => (
              <Card key={i} className="glass-card hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-heading font-semibold text-lg text-card-foreground">{job.title}</h3>
                      <p className="text-sm text-muted-foreground">{job.description}</p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 ${job.matchScore >= 80 ? "text-success border-success/20" : job.matchScore >= 60 ? "text-warning border-warning/20" : "text-info border-info/20"}`}>
                      {job.matchScore}% Match
                    </Badge>
                  </div>
                  <Progress value={job.matchScore} className="h-1.5 mb-3" />
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {job.requiredSkills.map((skill, j) => (
                      <Badge key={j} variant="secondary" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.salaryRange}</span>
                    <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {job.growthOutlook}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default JobRecommender;
