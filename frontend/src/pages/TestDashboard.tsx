import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart3, Loader2, CheckCircle, XCircle, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { apiClient, aiApi } from "@/lib/api";
import { toast } from "sonner";

type Question = {
  question: string;
  options: string[];
  correct: number;
};

const TestDashboard = () => {
  const [topic, setTopic] = useState("");
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ topic: string; score: number; total: number }[]>([]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setSubmitted(false);
    setAnswers({});
    try {
      const data = await aiApi.assistant("quiz-generator", topic);
      setQuiz(data.data?.questions || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const score = quiz.reduce((acc, q, i) => (answers[i] === q.correct ? acc + 1 : acc), 0);
    setHistory((prev) => [{ topic, score, total: quiz.length }, ...prev]);
    
    apiClient.post("/history/log", {
      feature_name: "test-manager",
      input_data: { topic, answers, questions: quiz },
      output_data: { score, total: quiz.length }
    });
  };

  const score = quiz.reduce((acc, q, i) => (answers[i] === q.correct ? acc + 1 : acc), 0);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold mb-1">Test Dashboard</h1>
          <p className="text-muted-foreground">Generate AI quizzes from any topic and track your performance.</p>
        </div>

        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex gap-3">
              <Input
                placeholder="Enter a topic (e.g., JavaScript, Biology)..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                className="bg-background/60 border-border/60 flex-1"
              />
              <Button onClick={handleGenerate} disabled={!topic.trim() || loading} className="gradient-primary text-primary-foreground border-0">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {quiz.length > 0 && (
          <div className="space-y-4">
            {quiz.map((q, qi) => (
              <Card key={qi} className="glass-card">
                <CardContent className="p-5">
                  <p className="font-medium text-card-foreground mb-3">
                    <span className="text-primary font-heading mr-2">{qi + 1}.</span>
                    {q.question}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => {
                      const isSelected = answers[qi] === oi;
                      const isCorrect = submitted && oi === q.correct;
                      const isWrong = submitted && isSelected && oi !== q.correct;
                      return (
                        <button
                          key={oi}
                          onClick={() => !submitted && setAnswers((a) => ({ ...a, [qi]: oi }))}
                          className={`p-3 rounded-lg border text-sm text-left transition-all ${
                            isCorrect
                              ? "border-success bg-success/10 text-success"
                              : isWrong
                              ? "border-destructive bg-destructive/10 text-destructive"
                              : isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/40 text-muted-foreground hover:text-card-foreground"
                          }`}
                          disabled={submitted}
                        >
                          <span className="flex items-center gap-2">
                            {isCorrect && <CheckCircle className="h-4 w-4 shrink-0" />}
                            {isWrong && <XCircle className="h-4 w-4 shrink-0" />}
                            {opt}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}

            {!submitted ? (
              <Button
                onClick={handleSubmit}
                disabled={Object.keys(answers).length < quiz.length}
                className="w-full gradient-primary text-primary-foreground border-0"
              >
                Submit Answers
              </Button>
            ) : (
              <Card className="glass-card">
                <CardContent className="p-6 text-center">
                  <Trophy className="h-8 w-8 text-accent mx-auto mb-2" />
                  <p className="font-heading text-2xl font-bold text-card-foreground">
                    {score}/{quiz.length}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    {score === quiz.length ? "Perfect score! 🎉" : score >= quiz.length / 2 ? "Good job! Keep learning." : "Keep practicing, you'll improve!"}
                  </p>
                  <Progress value={(score / quiz.length) * 100} className="h-2 max-w-xs mx-auto" />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {history.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-lg">Performance History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm text-card-foreground">{h.topic}</span>
                    <span className="text-sm font-medium text-primary">{h.score}/{h.total}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TestDashboard;
