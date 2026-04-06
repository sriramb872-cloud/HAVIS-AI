import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, FileText, Loader2, PlayCircle, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

export type HistoryRecord = {
  id: string;
  feature_name: string;
  input_data: any;
  output_data: any;
  created_at: string;
};

interface FeatureHistoryProps {
  featureName: string;
  onOpenRecord?: (record: HistoryRecord) => void;
}

export function FeatureHistory({ featureName, onOpenRecord }: FeatureHistoryProps) {
  const [date, setDate] = useState(() => {
    return format(new Date(), "yyyy-MM-dd");
  });
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, featureName]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/history/?feature_name=${featureName}&date=${date}`);
      setHistory(response);
    } catch (e: any) {
      toast.error(e.message || "Failed to load history.");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Prevent duplicate requests for the same record
    if (deletingIds.has(id)) return;

    console.debug("[FeatureHistory] Attempting delete for id:", id);

    setDeletingIds(prev => new Set(prev).add(id));
    try {
      await apiClient.delete(`/history/${id}`);
      toast.success("Record purged successfully.");
      setHistory(prev => prev.filter(r => r.id !== id));
    } catch (e: any) {
      const msg: string = e?.message || "";
      // 404 means the record is already gone (stale card) — remove it without alarming the user
      if (msg.includes("not found") || msg.includes("404") || msg.includes("unauthorized")) {
        console.warn("[FeatureHistory] Stale record removed from UI. Backend says:", msg);
        setHistory(prev => prev.filter(r => r.id !== id));
        // Silently clean up; no error toast for stale state
      } else {
        toast.error(msg || "Failed to purge record.");
      }
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const renderContentPreview = (record: HistoryRecord) => {
    let snippet = "No content available";
    try {
      if (featureName === "smart-notes" && record.output_data?.summary) snippet = record.output_data.summary;
      else if (featureName === "ai-podcast" && record.output_data?.topic) snippet = record.output_data.topic;
      else if (featureName.includes("mock-interview") && record.input_data?.role) snippet = `Role: ${record.input_data.role}`;
      else if (featureName === "task-manager-snapshot" && record.input_data?.snapshot) {
        snippet = `Tasks: ${record.input_data.snapshot.length} total active or completed tasks.`;
      } else if (featureName === "study-planner" && record.input_data?.topics) {
        snippet = `Topics: ${record.input_data.topics}`;
      } else {
        snippet = JSON.stringify(record.output_data || record.input_data || "").substring(0, 100);
      }
    } catch {}
    
    return (
      <div className="text-sm text-card-foreground/70 pr-4 leading-relaxed line-clamp-2">
        {snippet || "No additional data..."}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border/50 shadow-sm flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-medium text-lg">Execution Archives</h3>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground mr-1 hidden sm:block">Target Date</label>
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="w-40 bg-background/50 border-border shadow-sm hover:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {loading ? (
         <div className="h-32 grid place-items-center">
           <Loader2 className="h-8 w-8 text-primary animate-spin" />
         </div>
      ) : history.length === 0 ? (
        <Card className="glass-card bg-primary/5 border-primary/10">
          <CardContent className="h-32 flex flex-col items-center justify-center space-y-2">
            <FileText className="h-6 w-6 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground font-medium text-sm">No archives found for {date}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {history.map((record) => (
            <Card key={record.id} className="glass-card hover:bg-card/90 transition-colors group hover:border-primary/30 flex flex-col">
              <CardHeader className="pb-2 p-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                     <FileText className="h-4 w-4" />
                     {new Date(record.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-4 flex-1 flex flex-col justify-between">
                {renderContentPreview(record)}
                
                <div className="flex gap-2 justify-end pt-3 border-t border-border/40 mt-auto">
                  {onOpenRecord && (
                    <button 
                      onClick={() => onOpenRecord(record)}
                      className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors font-medium"
                    >
                      <PlayCircle className="h-3.5 w-3.5" /> Re-Engage
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(record.id)}
                    disabled={deletingIds.has(record.id)}
                    className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all font-medium
                      ${deletingIds.has(record.id)
                        ? "bg-destructive/20 text-destructive/60 cursor-not-allowed opacity-100"
                        : "bg-destructive/5 text-destructive/40 hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100"
                      }`}
                  >
                    {deletingIds.has(record.id)
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />
                    }
                    {deletingIds.has(record.id) ? "Purging..." : "Purge"}

                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
