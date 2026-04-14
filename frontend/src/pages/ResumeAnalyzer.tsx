import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, Upload, CheckCircle, AlertTriangle, 
  XCircle, Loader2, Briefcase, FileSearch, Info
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { aiApi } from "@/lib/api";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureHistory, HistoryRecord } from "@/components/FeatureHistory";

interface AnalysisResult {
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  improvement_suggestions: string[];
  ats_feedback: string;
  verdict: string;
}

const ResumeAnalyzer = () => {
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("workspace");

  const handleHistoryOpen = (record: HistoryRecord) => {
    if (record.output_data?.match_score !== undefined) {
      setResult(record.output_data);
      if (record.input_data) {
        setResumeText(record.input_data.resume_text || "");
        setJdText(record.input_data.jd_text || "");
      }
      setActiveTab("workspace");
      toast.success("Loaded from archives.");
    } else {
      toast.error("Archive missing output data.");
    }
  };

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const jdInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    // Phase 4: Basic Input Validation
    const isResumeEmpty = !resumeFile && (!resumeText.trim() || resumeText.trim().length < 5);
    const isJDEmpty = !jdFile && (!jdText.trim() || jdText.trim().length < 5);

    if (isResumeEmpty || isJDEmpty) {
      toast.error("Please provide both a valid resume and a job description (min 5 characters).");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (resumeFile) formData.append("resume", resumeFile);
      if (resumeText) formData.append("resume_text", resumeText);
      if (jdFile) formData.append("job_description", jdFile);
      if (jdText) formData.append("job_description_text", jdText);

      const response = await aiApi.analyzeResume(formData);
      
      if (response.status === "error") {
        throw new Error(response.message || response.error || "Analysis failed");
      }
      
      setResult(response.data);
      toast.success("Analysis complete!");
    } catch (e: any) {
      console.error("Resume Analysis Error:", e);
      toast.error(e.message || "AI Analysis Service is currently busy. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const onResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  const onJDFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setJdFile(e.target.files[0]);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold mb-2">Resume Analyzer</h1>
              <p className="text-muted-foreground text-lg">Compare your resume against a specific job description for matching scores and tailored feedback.</p>
            </div>
            <TabsList className="grid w-full sm:max-w-[240px] grid-cols-2">
              <TabsTrigger value="workspace">Workspace</TabsTrigger>
              <TabsTrigger value="history">Archives</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="workspace" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid gap-6 md:grid-cols-2">
          {/* Resume Input Section */}
          <Card className="glass-card flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-xl flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Your Resume
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="flex flex-col gap-2">
                <Textarea
                  placeholder="Paste your resume content here..."
                  className="min-h-[150px] flex-1 resize-none bg-background/60 border-border/60"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm truncate max-w-[200px]">
                    {resumeFile ? (
                      <span className="text-primary font-medium flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> {resumeFile.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No file selected</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resumeInputRef.current?.click()}
                    className="shrink-0"
                  >
                    <Upload className="h-4 w-4 mr-2" /> Upload File
                  </Button>
                  <input
                    type="file"
                    ref={resumeInputRef}
                    onChange={onResumeFileChange}
                    className="hidden"
                    accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Description Input Section */}
          <Card className="glass-card flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-xl flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-accent" /> Job Description
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="flex flex-col gap-2">
                <Textarea
                  placeholder="Paste the job description here..."
                  className="min-h-[150px] flex-1 resize-none bg-background/60 border-border/60"
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                />
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm truncate max-w-[200px]">
                    {jdFile ? (
                      <span className="text-accent font-medium flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> {jdFile.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No file selected</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => jdInputRef.current?.click()}
                    className="shrink-0"
                  >
                    <Upload className="h-4 w-4 mr-2" /> Upload File
                  </Button>
                  <input
                    type="file"
                    ref={jdInputRef}
                    onChange={onJDFileChange}
                    className="hidden"
                    accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            onClick={handleAnalyze}
            disabled={loading}
            className="gradient-primary text-primary-foreground px-12 h-12 text-lg font-semibold"
          >
            {loading ? <Loader2 className="h-5 w-5 mr-3 animate-spin" /> : <FileSearch className="h-5 w-5 mr-3" />}
            {loading ? "Analyzing..." : "Analyze Match"}
          </Button>
        </div>

        {result && (
          <div className="space-y-6 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="glass-card md:col-span-1">
                <CardContent className="p-8 text-center flex flex-col items-center justify-center h-full">
                  <p className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">Match Score</p>
                  <p className={`text-6xl font-heading font-bold ${getScoreColor(result.match_score)}`}>
                    {result.match_score}<span className="text-2xl text-muted-foreground">%</span>
                  </p>
                  <Progress value={result.match_score} className="mt-6 h-2 w-full" />
                  <div className="mt-6 p-3 rounded-lg bg-primary/5 w-full">
                    <p className="text-sm font-semibold">Verdict</p>
                    <p className="text-primary font-bold">{result.verdict}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card md:col-span-2">
                <CardHeader>
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" /> ATS Analysis Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed italic text-lg">
                    "{result.ats_feedback}"
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card className="glass-card hover-scale transition-all duration-300">
                <CardHeader className="pb-3 border-b border-border/50 mb-3">
                  <CardTitle className="font-heading text-base flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" /> Matched Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.matched_skills.map((s, i) => (
                      <span key={i} className="px-3 py-1 bg-success/10 text-success text-xs rounded-full font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card hover-scale transition-all duration-300">
                <CardHeader className="pb-3 border-b border-border/50 mb-3">
                  <CardTitle className="font-heading text-base flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" /> Missing Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.missing_skills.map((s, i) => (
                      <span key={i} className="px-3 py-1 bg-destructive/10 text-destructive text-xs rounded-full font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card hover-scale transition-all duration-300">
                <CardHeader className="pb-3 border-b border-border/50 mb-3">
                  <CardTitle className="font-heading text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" /> Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {result.improvement_suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-3">
                        <span className="text-warning font-bold flex-shrink-0">→</span> {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
          </TabsContent>
          <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <FeatureHistory 
               featureName="resume-analyzer" 
               onOpenRecord={handleHistoryOpen}
             />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ResumeAnalyzer;
