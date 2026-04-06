import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Circle, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureHistory, HistoryRecord } from "@/components/FeatureHistory";

type Task = {
  id: number;
  title: string;
  priority: "High" | "Medium" | "Low";
  done: boolean;
};

const priorityColors: Record<string, string> = {
  High: "bg-destructive/10 text-destructive border-destructive/20",
  Medium: "bg-warning/10 text-warning border-warning/20",
  Low: "bg-success/10 text-success border-success/20",
};

const TaskManager = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState("workspace");

  const handleHistoryOpen = (record: HistoryRecord) => {
    if (record.input_data?.snapshot) {
      setTasks(record.input_data.snapshot);
      setActiveTab("workspace");
      toast.success("Loaded tasks from archives.");
    } else {
      toast.error("Archive missing output data.");
    }
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    setAdding(true);
    try {
      const fd = new FormData();
      fd.append("type", "task-priority");
      fd.append("content", newTask);
      
      const data = await apiClient.postForm("/ai/assistant", fd);
      
      const priority = (data.data?.priority || "Medium") as "High" | "Medium" | "Low";
      const taskArr: Task[] = [
        { id: Date.now(), title: newTask, priority, done: false },
        ...tasks,
      ];
      setTasks(taskArr);
      toast.success(`Task added with ${priority} priority`);
      setNewTask("");
      
      // Auto-save history payload securely mapped.
      apiClient.post("/history/log", {
        feature_name: "task-manager-snapshot",
        input_data: { snapshot: taskArr },
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to determine priority");
      // Fallback: add with Medium priority
      const taskArr: Task[] = [
        { id: Date.now(), title: newTask, priority: "Medium" as const, done: false },
        ...tasks,
      ];
      setTasks(taskArr);
      setNewTask("");
      
      apiClient.post("/history/log", {
        feature_name: "task-manager-snapshot",
        input_data: { snapshot: taskArr },
      });
    } finally {
      setAdding(false);
    }
  };

  const toggleTask = (id: number) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    setTasks(updated);
    apiClient.post("/history/log", { feature_name: "task-manager-snapshot", input_data: { snapshot: updated } });
  };

  const deleteTask = (id: number) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    apiClient.post("/history/log", { feature_name: "task-manager-snapshot", input_data: { snapshot: updated } });
  };

  const filtered = tasks.filter((t) => {
    if (filter === "done") return t.done;
    if (filter === "active") return !t.done;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <div>
              <h1 className="font-heading text-2xl font-bold mb-1">Task Manager</h1>
              <p className="text-muted-foreground">
                Add tasks and AI will suggest priority levels.
                <Sparkles className="h-3.5 w-3.5 inline ml-1 text-accent" />
              </p>
            </div>
            <TabsList className="grid w-full sm:max-w-[240px] grid-cols-2">
              <TabsTrigger value="workspace">Workspace</TabsTrigger>
              <TabsTrigger value="history">Archives</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="workspace" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex gap-3">
              <Input
                placeholder="Add a new task..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                className="bg-background/60 border-border/60 flex-1"
                disabled={adding}
              />
              <Button onClick={addTask} disabled={!newTask.trim() || adding} className="gradient-primary text-primary-foreground border-0">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          {["all", "active", "done"].map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "secondary"}
              onClick={() => setFilter(f)}
              className={filter === f ? "gradient-primary text-primary-foreground border-0" : ""}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
          <span className="ml-auto text-sm text-muted-foreground self-center">
            {tasks.filter((t) => !t.done).length} remaining
          </span>
        </div>

        <div className="space-y-2">
          {filtered.map((task) => (
            <Card key={task.id} className={`glass-card transition-opacity ${task.done ? "opacity-60" : ""}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <button onClick={() => toggleTask(task.id)} className="shrink-0">
                  {task.done ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                  )}
                </button>
                <span className={`flex-1 text-sm ${task.done ? "line-through text-muted-foreground" : "text-card-foreground"}`}>
                  {task.title}
                </span>
                <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>
                  {task.priority}
                </Badge>
                <button onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">No tasks found.</p>
          )}
        </div>
          </TabsContent>
          <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <FeatureHistory 
               featureName="task-manager-snapshot" 
               onOpenRecord={handleHistoryOpen}
             />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TaskManager;
