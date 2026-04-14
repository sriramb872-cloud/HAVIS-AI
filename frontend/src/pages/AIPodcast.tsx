import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Podcast, Loader2, Play, Users, StopCircle, Volume2 } from "lucide-react";
import { aiApi } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureHistory, HistoryRecord } from "@/components/FeatureHistory";

const genders = ["Male", "Female", "Non-binary", "AI Synthetic"];

const AIPodcast = () => {
  const [material, setMaterial] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hostGender, setHostGender] = useState("Male");
  const [guestGender, setGuestGender] = useState("Female");
  
  const [episodeInfo, setEpisodeInfo] = useState<{ title: string; topic: string } | null>(null);
  const [script, setScript] = useState("");
  const [dialogueTurns, setDialogueTurns] = useState<{ speaker: string; text: string; instruction: string }[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTurn, setCurrentTurn] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("workspace");

  const handleHistoryOpen = (record: HistoryRecord) => {
    if (record.output_data?.dialogue_turns) {
      setEpisodeInfo({ title: record.output_data.title, topic: record.output_data.topic });
      setScript(record.output_data.script);
      setDialogueTurns(record.output_data.dialogue_turns);
      if (record.input_data?.topic_summary) setMaterial(record.input_data.topic_summary);
      setActiveTab("workspace");
      toast.success("Loaded podcast episode from archives.");
    } else {
      toast.error("Archive missing output data.");
    }
  };

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleGenerate = async () => {
    if (!material.trim() && !file) return;
    setLoading(true);
    
    // Stop any playing audio before generating new
    if (isPlaying && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentTurn(null);
    }

    try {
      const response = await aiApi.generatePodcast(material, hostGender, guestGender, file);
      if (response.status === "error") throw new Error(response.error || response.message);
      
      const data = response.data;
      setEpisodeInfo({ title: data.title, topic: data.topic });
      setScript(data.script);
      setDialogueTurns(data.dialogue_turns || []);
      toast.success("Podcast episode perfectly crafted!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate podcast episode");
    } finally {
      setLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!("speechSynthesis" in window)) {
      toast.error("Your browser does not support experimental text-to-speech.");
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentTurn(null);
      return;
    }

    if (dialogueTurns.length === 0) return;

    setIsPlaying(true);
    let flowIndex = 0;

    const speakNext = () => {
      if (flowIndex >= dialogueTurns.length) {
        setIsPlaying(false);
        setCurrentTurn(null);
        return;
      }

      const turn = dialogueTurns[flowIndex];
      setCurrentTurn(flowIndex);

      const utterance = new SpeechSynthesisUtterance(turn.text);

      const isHost = turn.speaker === "Host";
      const genderMap = isHost ? hostGender : guestGender;
      const isFemale = genderMap.toLowerCase().includes("female");

      const voices = window.speechSynthesis.getVoices();
      
      let selectedVoice;
      if (isFemale) {
        selectedVoice = voices.find(v => v.name.includes("Female") || v.name.includes("Samantha") || v.name.includes("Zira") || v.name.includes("Google UK English Female")) || voices[0];
      } else {
        selectedVoice = voices.find(v => v.name.includes("Male") || v.name.includes("David") || v.name.includes("Daniel") || v.name.includes("Google UK English Male")) || voices[0];
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.pitch = isHost ? 1.05 : 0.95;
      utterance.rate = 1.05;

      utterance.onend = () => {
        flowIndex++;
        speakNext();
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        setCurrentTurn(null);
      };

      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = speakNext;
    } else {
      speakNext();
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold mb-1 tracking-tight">AI Podcast Studio</h1>
              <p className="text-muted-foreground text-lg">Convert information into engaging educational conversations with dynamic audio playback.</p>
            </div>
            <TabsList className="grid w-full sm:max-w-[240px] grid-cols-2">
              <TabsTrigger value="workspace">Workspace</TabsTrigger>
              <TabsTrigger value="history">Archives</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="workspace" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="glass-card overflow-hidden">
          <CardContent className="p-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Host Persona (Interviewer)</label>
                <Select value={hostGender} onValueChange={setHostGender}>
                  <SelectTrigger className="bg-background/60 border-border/60">
                    <SelectValue placeholder="Host Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genders.map((g) => (
                      <SelectItem key={g} value={g}>{g} Voice</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Guest Persona (Expert)</label>
                <Select value={guestGender} onValueChange={setGuestGender}>
                  <SelectTrigger className="bg-background/60 border-border/60">
                    <SelectValue placeholder="Guest Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genders.map((g) => (
                      <SelectItem key={g} value={g}>{g} Voice</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder="Paste the core knowledge material or topic to discuss here..."
                className="min-h-[150px] resize-none bg-background/60 border-border/60 text-base"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
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
              disabled={(!material.trim() && !file) || loading}
              className="gradient-primary text-primary-foreground border-0 px-8 h-12 text-lg"
            >
              {loading ? <Loader2 className="h-5 w-5 mr-3 animate-spin" /> : <Podcast className="h-5 w-5 mr-3" />}
              {loading ? "Composing Episode..." : "Produce Podcast Episode"}
            </Button>
          </CardContent>
        </Card>

        {dialogueTurns.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {episodeInfo && (
              <div className="text-center space-y-2 bg-background/50 p-6 rounded-2xl border border-primary/20 backdrop-blur-md">
                <h2 className="font-heading text-3xl font-black text-primary drop-shadow-sm">{episodeInfo.title}</h2>
                <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Today's Topic: {episodeInfo.topic}</p>
              </div>
            )}
            
            <Card className="glass-card shadow-xl border-primary/10">
              <CardHeader className="border-b border-border/5 bg-primary/5 p-6 flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <Volume2 className="h-6 w-6 text-primary" />
                  <CardTitle className="font-heading text-xl">Playback Studio</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="px-3 py-1 font-mono uppercase text-[10px]">Browser TTS Ready</Badge>
                  <Button 
                    onClick={togglePlayback}
                    variant={isPlaying ? "destructive" : "default"}
                    size="sm"
                    className="h-8 gap-2 transition-all w-36 shadow-md"
                  >
                    {isPlaying ? (
                      <><StopCircle className="h-4 w-4" /> Pause Audio</>
                    ) : (
                      <><Play className="h-4 w-4" /> Play Audio Flow</>
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0 max-h-[600px] overflow-auto scroll-smooth">
                <div className="p-8 space-y-6 leading-relaxed">
                  {dialogueTurns.map((turn, i) => (
                    <div 
                      key={i} 
                      className={`flex gap-4 group transition-all duration-300 ${
                        currentTurn === i ? "scale-[1.02] bg-primary/10 border-primary/30 shadow-lg ring-1 ring-primary/20" : 
                        turn.speaker === "Host" ? "bg-primary/5 border-transparent" : "bg-accent/5 border-transparent"
                      } p-5 rounded-2xl border`}
                    >
                      <div className="flex-shrink-0 flex flex-col items-center justify-start mt-1">
                        <div className={`p-3 rounded-full ${
                          currentTurn === i ? "bg-primary text-primary-foreground animate-pulse shadow-md" : 
                          turn.speaker === "Host" ? "bg-primary/20" : "bg-accent/20"
                        } mb-2 transition-colors`}>
                         <Users className={`h-5 w-5 ${
                           currentTurn === i ? "" : turn.speaker === "Host" ? "text-primary" : "text-accent"
                         }`} />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest opacity-60">{turn.speaker}</span>
                      </div>
                      <div className="flex-grow space-y-2 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black italic opacity-40 text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full">[{turn.instruction}]</span>
                        </div>
                        <p className={`text-base font-medium leading-relaxed ${currentTurn === i ? "text-foreground" : "text-card-foreground/80"}`}>
                          {turn.text}
                        </p>
                      </div>
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
               featureName="ai-podcast" 
               onOpenRecord={handleHistoryOpen}
             />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AIPodcast;
