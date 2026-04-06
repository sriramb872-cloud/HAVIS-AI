import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { aiApi } from "@/lib/api";
import { toast } from "sonner";
import { Video, Mic, MicOff, Loader2, Bot, PlayCircle, Star, AlertCircle, StopCircle, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureHistory, HistoryRecord } from "@/components/FeatureHistory";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function MockInterview() {
  const [phase, setPhase] = useState<"setup" | "interview" | "review">("setup");
  
  // Setup State
  const [role, setRole] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [roundType, setRoundType] = useState("Technical");
  const [numQuestions, setNumQuestions] = useState("5");
  const [avatar, setAvatar] = useState("Alex");

  // Interview State
  const [sessionId, setSessionId] = useState("");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [currentAiQuestion, setCurrentAiQuestion] = useState("");
  const [currentAiReaction, setCurrentAiReaction] = useState("");
  const [interviewStatus, setInterviewStatus] = useState<"connecting" | "ai_speaking" | "listening" | "thinking">("connecting");
  const [transcript, setTranscript] = useState<{ speaker: string, text: string }[]>([]);
  
  // Recognition & Media
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recognition, setRecognition] = useState<any>(null);
  const [userSpeechDraft, setUserSpeechDraft] = useState("");
  
  // Review State
  const [reviewData, setReviewData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("workspace");
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const localVideoUrlRef = useRef<string | null>(null); // Ref to always hold latest URL for cleanup
  const [loading, setLoading] = useState(false);

  const handleHistoryOpen = (record: HistoryRecord) => {
    if (record.output_data?.overall_review) {
      setReviewData(record.output_data);
      if (record.input_data?.session_id) setSessionId(record.input_data.session_id);
      setPhase("review");
      setActiveTab("workspace");
      toast.success("Loaded interview review from archives.");
    } else {
      toast.error("Archive missing review data.");
    }
  };

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      
      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setUserSpeechDraft(prev => prev + " " + finalTranscript);
        }
      };
      
      rec.onerror = (e: any) => {
        console.error("Speech error", e);
        toast.error("Speech recognition error. Please check your microphone permissions.");
        setInterviewStatus("listening");
      };
      setRecognition(rec);
    }
  }, []);

  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
      'video/ogg'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  // Control WebCam
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Initialize MediaRecorder
      recordedChunksRef.current = [];
      const mimeType = getSupportedMimeType();
      
      if (!mimeType) {
        throw new Error("No supported video recording format found in this browser.");
      }

      const recorder = new MediaRecorder(mediaStream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      recorder.start(200); // 200ms slices for more frequent data delivery
      mediaRecorderRef.current = recorder;
    } catch (e) {
      toast.error("Failed to access camera/mic. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("Error stopping MediaRecorder", e);
      }
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Turn orchestration
  const playAiAudio = (text: string, onEndCallback: () => void) => {
    if (!("speechSynthesis" in window)) {
      onEndCallback();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Pick voice randomly mapped to Avatar selected loosely
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices[0];
    if (avatar === "Alex" && voices.find(v => v.name.toLocaleLowerCase().includes("male"))) selectedVoice = voices.find(v => v.name.toLocaleLowerCase().includes("male"))!;
    if (avatar === "Sarah" && voices.find(v => v.name.toLocaleLowerCase().includes("female"))) selectedVoice = voices.find(v => v.name.toLocaleLowerCase().includes("female"))!;
    if (selectedVoice) utterance.voice = selectedVoice;
    
    utterance.rate = 1.05;
    utterance.onend = onEndCallback;
    window.speechSynthesis.speak(utterance);
  };

  const runAiTurn = (reaction: string, question: string, qNumber: number, isComplete: boolean) => {
    setInterviewStatus("ai_speaking");
    setCurrentAiReaction(reaction);
    setCurrentAiQuestion(question);
    setQuestionNumber(qNumber);
    
    setTranscript(prev => [
      ...prev, 
      ...(reaction ? [{ speaker: "AI", text: reaction }] : []),
      ...(question ? [{ speaker: "AI", text: question }] : [])
    ]);

    const fullSpokenText = `${reaction} ${question}`.trim();
    
    if (fullSpokenText) {
      playAiAudio(fullSpokenText, () => {
        if (!isComplete) {
          startListening();
        } else {
          setPhase("review");
          fetchReview();
        }
      });
    } else if (isComplete) {
       setPhase("review");
       fetchReview();
    } else {
       startListening();
    }
  };

  const startInterview = async () => {
    // Phase 4: Basic Input Validation
    if (!role.trim() || role.trim().length < 5) {
      toast.error("Please enter a specific role (at least 5 characters).");
      return;
    }
    
    setPhase("interview");
    setInterviewStatus("connecting");
    setLoading(true);
    if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);
    setLocalVideoUrl(null);
    await startCamera();
    
    try {
      const response = await aiApi.startMockInterview(role, difficulty, roundType, parseInt(numQuestions), avatar);
      if (response.status === "error") throw new Error(response.error);
      
      const { session_id, ai_reaction, ai_question, question_number, is_complete } = response.data;
      setSessionId(session_id);
      runAiTurn(ai_reaction, ai_question, question_number, is_complete);
    } catch (e: any) {
      toast.error(e.message || "Failed to connect to AI Server.");
      setPhase("setup");
      stopCamera();
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    setInterviewStatus("listening");
    setUserSpeechDraft("");
    if (recognition) {
       try { recognition.start(); } catch(e){}
    }
  };

  const stopListeningAndSubmit = async (forcedAnswer?: string) => {
    if (recognition) {
      try { recognition.stop(); } catch(e){}
    }
    
    // Evaluate explicit skip/wait commands vs normal speech draft
    let answerToLogic = "(User stayed silent or mic error)";
    if (forcedAnswer !== undefined) {
      answerToLogic = forcedAnswer.trim() || answerToLogic;
    } else {
      answerToLogic = userSpeechDraft.trim() || answerToLogic;
    }
    
    setTranscript(prev => [...prev, { speaker: "User", text: answerToLogic }]);
    setInterviewStatus("thinking");
    
    try {
      const response = await aiApi.nextMockInterviewTurn(sessionId, answerToLogic);
      if (response.status === "error") throw new Error(response.error);
      
      const { ai_reaction, ai_question, question_number, is_complete } = response.data;
      runAiTurn(ai_reaction, ai_question, question_number, is_complete);
    } catch (e: any) {
      toast.error(e.message || "Failed to process turn.");
      setInterviewStatus("listening"); // revert to let them try again
    }
  };
  
  const fetchReview = async () => {
    setLoading(true);
    // 1. Ensure MediaRecorder has stopped and flushed all data
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = () => resolve();
          mediaRecorderRef.current.stop();
        } else {
          resolve();
        }
      });
    }

    const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
    
    // 2. Validate recording data
    if (videoBlob.size === 0) {
      console.warn("Media capture produced 0 bytes. Check camera/mic activity.");
      toast.error("Recording failed or was empty. Please check your webcam/mic and try again.");
      setPhase("interview");
      setInterviewStatus("listening");
      return; 
    }

    const blobUrl = URL.createObjectURL(videoBlob);
    setLocalVideoUrl(blobUrl);
    
    // 3. Cleanup hardware
    stopCamera();
    
    setInterviewStatus("thinking");
    try {
      const formData = new FormData();
      formData.append("session_id", sessionId);
      formData.append("video", videoBlob, "interview_recording.webm");
      
      const res = await aiApi.getMockInterviewReview(formData);
      if (res.status === "error") throw new Error(res.error);
      setReviewData(res.data);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate review");
      setPhase("interview");
      setInterviewStatus("listening");
    } finally {
      setLoading(false);
      // We don't revoke immediately because the player might still be using it 
      // if the backend URL failed or is still loading. 
      // It will be cleaned up on unmount or next session start.
    }
  };

  // Keep ref in sync with state so unmount cleanup always has the latest URL
  useEffect(() => {
    localVideoUrlRef.current = localVideoUrl;
  }, [localVideoUrl]);

  // Stop camera tracks when stream changes
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stream]);

  // Revoke blob URL only on full unmount (separate from stream cleanup to avoid premature revocation)
  useEffect(() => {
    return () => {
      if (localVideoUrlRef.current) {
        URL.revokeObjectURL(localVideoUrlRef.current);
      }
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {phase === "setup" && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
              <div>
                <h1 className="font-heading text-4xl font-bold mb-2 tracking-tight">AI Mock Interview</h1>
                <p className="text-muted-foreground text-lg">Practice real-time technical and behavioral video interviews with an AI Recruiter.</p>
              </div>
              <TabsList className="grid w-full sm:max-w-[240px] grid-cols-2">
                <TabsTrigger value="workspace">Workspace</TabsTrigger>
                <TabsTrigger value="history">Archives</TabsTrigger>
              </TabsList>
            </div>
          )}

          <TabsContent value="workspace" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {phase === "setup" && (
          <div className="animate-in fade-in zoom-in-95 duration-500 max-w-2xl mx-auto">

            
            <Card className="glass-card shadow-2xl border-primary/20">
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase text-muted-foreground ml-1">Target Role</label>
                  <Input 
                    placeholder="e.g., Senior Full-Stack Engineer, Product Manager..." 
                    className="h-12 text-lg bg-background/50 border-primary/20"
                    value={role} onChange={(e) => setRole(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-muted-foreground ml-1">Difficulty</label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                       <SelectTrigger className="bg-background/50 h-11"><SelectValue /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="Easy">Beginner / Junior</SelectItem>
                         <SelectItem value="Medium">Intermediate</SelectItem>
                         <SelectItem value="Hard">Expert / Senior</SelectItem>
                       </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-muted-foreground ml-1">Round Type</label>
                    <Select value={roundType} onValueChange={setRoundType}>
                       <SelectTrigger className="bg-background/50 h-11"><SelectValue /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="Technical">Technical Deep Dive</SelectItem>
                         <SelectItem value="Behavioral">Behavioral / HR</SelectItem>
                         <SelectItem value="Systems Design">Architecture / Design</SelectItem>
                         <SelectItem value="Mixed">Mixed Comprehensive</SelectItem>
                       </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-muted-foreground ml-1">Length</label>
                    <Select value={numQuestions} onValueChange={setNumQuestions}>
                       <SelectTrigger className="bg-background/50 h-11"><SelectValue /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="4">Short (4 Questions)</SelectItem>
                         <SelectItem value="6">Standard (6 Questions)</SelectItem>
                         <SelectItem value="8">Full (8 Questions)</SelectItem>
                       </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-muted-foreground ml-1">Interviewer</label>
                    <Select value={avatar} onValueChange={setAvatar}>
                       <SelectTrigger className="bg-background/50 h-11"><SelectValue /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="Alex">Alex (Technical Lead, Male)</SelectItem>
                         <SelectItem value="Sarah">Sarah (VP Engineering, Female)</SelectItem>
                         <SelectItem value="Morgan">Morgan (Principal, Neutral)</SelectItem>
                       </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={startInterview} 
                  disabled={loading}
                  className="w-full h-14 mt-4 gradient-primary text-xl font-bold shadow-lg shadow-primary/20"
                >
                  {loading ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : <Video className="mr-3 h-6 w-6" />}
                  {loading ? "Connecting..." : "Start Video Interview"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {phase === "interview" && (
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 h-[80vh] flex flex-col items-center justify-center">
            
            {/* STAGE: Video Feeds */}
            <div className="grid grid-cols-2 w-full max-w-5xl gap-6">
              
              {/* AI Avatar Pane */}
              <div className="relative rounded-3xl overflow-hidden bg-black/40 border border-primary/20 aspect-video flex flex-col items-center justify-center shadow-2xl relative group">
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  <Badge variant="secondary" className="bg-black/60 backdrop-blur-md border-primary/30 flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" /> {avatar} (AI Interviewer)
                  </Badge>
                  {interviewStatus === "ai_speaking" && (
                    <Badge variant="destructive" className="animate-pulse bg-blue-500/80">Speaking</Badge>
                  )}
                </div>
                
                {/* AI Visual (Synthetic Avatar Placeholder for now) */}
                <div className={`p-12 rounded-full ${interviewStatus === "ai_speaking" ? "bg-primary/20 animate-pulse ring-8 ring-primary/10" : "bg-card/50"} transition-all duration-500`}>
                  <Bot className={`h-24 w-24 ${interviewStatus === "ai_speaking" ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                
                {interviewStatus === "thinking" && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <span className="ml-3 font-bold text-lg tracking-widest uppercase">Evaluating...</span>
                  </div>
                )}
              </div>

              {/* User Webcam Pane */}
              <div className="relative rounded-3xl overflow-hidden bg-black border border-border/40 aspect-video shadow-2xl flex items-center justify-center">
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  <Badge variant="secondary" className="bg-black/60 backdrop-blur-md flex items-center gap-2">
                    <Video className="h-4 w-4" /> You
                  </Badge>
                  {interviewStatus === "listening" && (
                     <Badge variant="destructive" className="animate-pulse shadow-red-500/50 shadow-lg">Live - Mic On</Badge>
                  )}
                </div>

                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover mirror"
                  style={{ transform: "scaleX(-1)" }} // mirror for natural feel
                />

                {interviewStatus === "listening" && (
                  <div className="absolute bottom-6 w-full flex justify-center z-20 gap-3">
                    <Button onClick={() => stopListeningAndSubmit(userSpeechDraft)} size="sm" className="bg-primary/90 hover:bg-primary text-primary-foreground rounded-full shadow-2xl px-6 h-12">
                       <PlayCircle className="mr-2 h-4 w-4" /> Submit
                    </Button>
                    <Button onClick={() => stopListeningAndSubmit("(User stayed silent. Please ask if they need more time.)")} size="sm" variant="secondary" className="bg-secondary/90 hover:bg-secondary text-secondary-foreground rounded-full shadow-xl px-4 h-12">
                       Wait
                    </Button>
                    <Button onClick={() => stopListeningAndSubmit("(User skipped this question. Please move to the next one.)")} size="sm" variant="destructive" className="bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-full shadow-xl px-4 h-12">
                       Skip
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Conversation Core */}
            <div className="mt-8 w-full max-w-4xl text-center space-y-4 bg-background/40 backdrop-blur-md p-8 rounded-3xl border border-white/5 relative">
              <div className="absolute -top-4 right-8">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="rounded-full shadow-lg h-10 px-6 gap-2">
                      <StopCircle className="h-4 w-4" /> End Session Early
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-card border-destructive/20">
                    <AlertDialogHeader>
                      <AlertDialogTitle>End Interview Session?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will stop the recording and generate feedback based on your responses so far. You cannot resume this specific session once closed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-full">Continue Interview</AlertDialogCancel>
                      <AlertDialogAction onClick={() => {
                        setPhase("review");
                        fetchReview();
                      }} className="bg-destructive hover:bg-destructive/90 rounded-full">
                        End and Review
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <Badge variant="outline" className="mb-2 text-primary border-primary/20">
                Question {questionNumber} of {numQuestions}
              </Badge>
              
              <div className="space-y-3 min-h-[120px]">
                {currentAiReaction && <p className="text-muted-foreground text-lg italic tracking-wide">"{currentAiReaction}"</p>}
                {currentAiQuestion && <h2 className="text-3xl font-heading font-black leading-tight text-foreground">{currentAiQuestion}</h2>}
              </div>

              {interviewStatus === "listening" && userSpeechDraft && (
                 <div className="mt-6 p-4 rounded-xl bg-card border border-border/50 text-left">
                   <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Mic className="h-4 w-4 animate-pulse text-red-400" /> Live Transcription (Draft)
                   </p>
                   <p className="text-lg opacity-80">{userSpeechDraft}</p>
                 </div>
              )}
            </div>

          </div>
        )}

        {phase === "review" && (
          <div className="animate-in slide-in-from-bottom-10 duration-700">
            {!reviewData ? (
              <div className="h-[60vh] flex flex-col items-center justify-center space-y-6">
                 <div className="relative">
                   <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                   <Loader2 className="h-16 w-16 animate-spin text-primary relative z-10" />
                 </div>
                 <h2 className="text-2xl font-bold font-heading">Compiling Interview Feedback...</h2>
                 <p className="text-muted-foreground">The AI is analyzing your communication, technical rigor, and confidence.</p>
              </div>
            ) : (
              <div className="max-w-5xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <Badge variant="secondary" className="mb-2 text-primary uppercase tracking-widest">Interview Concluded</Badge>
                  <h1 className="text-5xl font-heading font-black">Performance Review</h1>
                  <h2 className="text-2xl font-bold text-muted-foreground">{role}</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* SESSION VIDEO CARD */}
                  <Card className="md:col-span-3 glass-card border-primary/20 overflow-hidden bg-black flex items-center justify-center aspect-[21/9]">
                    <div className="w-full max-w-4xl h-full p-4 relative flex items-center justify-center">
                      {(() => {
                        // Prioritize local blob URL first (avoids 416 from 0-byte backend files),
                        // then fall back to the persisted backend URL (e.g. when loading from history).
                        const backendUrl = reviewData.video_url
                          ? `http://localhost:8000${reviewData.video_url}`
                          : null;
                        const videoSrc = localVideoUrl || backendUrl;
                        console.log("VIDEO URL:", videoSrc, "| local:", !!localVideoUrl, "| backend:", backendUrl);

                        return videoSrc ? (
                          <video
                            key={videoSrc}
                            src={videoSrc}
                            controls
                            className="h-full w-full object-contain rounded-xl shadow-2xl"
                            onError={(e) => {
                              const videoElement = e.currentTarget;
                              console.error("Video playback error on src:", videoElement.src);
                              // If currently using the blob and it fails, try the backend URL
                              if (localVideoUrl && backendUrl && videoElement.src === localVideoUrl) {
                                console.log("Falling back to backend URL:", backendUrl);
                                videoElement.src = backendUrl;
                                videoElement.load();
                              }
                              // Both sources failed — the video element will show its native error state
                            }}
                          >
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          <div className="text-muted-foreground flex flex-col items-center gap-2">
                            <XCircle className="h-10 w-10 opacity-20" />
                            <p className="text-sm font-medium opacity-50">Interview recording unavailable</p>
                          </div>
                        );
                      })()}
                      <Badge className="absolute top-8 left-8 bg-black/60 backdrop-blur border-white/10 uppercase tracking-widest">
                        Recorded Session
                      </Badge>
                    </div>
                  </Card>

                  {/* OVERALL SUMMARY CARD */}
                  <Card className="md:col-span-3 glass-card border-primary/20 overflow-hidden">
                    <div className="bg-primary/5 border-b border-primary/10 p-6 flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold font-heading text-primary">Verdict: {reviewData.overall_review.verdict}</h3>
                        <p className="text-muted-foreground text-sm">Overall performance assessment</p>
                      </div>
                      <Star className="h-10 w-10 text-primary opacity-50" />
                    </div>
                    <CardContent className="p-8 grid md:grid-cols-3 gap-8">
                       <div className="space-y-2">
                         <h4 className="font-bold text-xs uppercase tracking-widest opacity-60">Communication</h4>
                         <p className="text-sm">{reviewData.overall_review.communication}</p>
                       </div>
                       <div className="space-y-2">
                         <h4 className="font-bold text-xs uppercase tracking-widest opacity-60">Technical</h4>
                         <p className="text-sm">{reviewData.overall_review.technical_knowledge}</p>
                       </div>
                       <div className="space-y-2">
                         <h4 className="font-bold text-xs uppercase tracking-widest opacity-60">Confidence</h4>
                         <p className="text-sm">{reviewData.overall_review.confidence}</p>
                       </div>
                       
                       <div className="col-span-3 h-px bg-border my-2"></div>
                       
                       <div className="space-y-3">
                         <h4 className="font-bold text-xs uppercase tracking-widest text-emerald-400">Key Strengths</h4>
                         <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                            {reviewData.overall_review.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                         </ul>
                       </div>
                       <div className="space-y-3">
                         <h4 className="font-bold text-xs uppercase tracking-widest text-red-400">Core Weaknesses</h4>
                         <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                            {reviewData.overall_review.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
                         </ul>
                       </div>
                       <div className="space-y-3">
                         <h4 className="font-bold text-xs uppercase tracking-widest text-primary">Actionable Roadmap</h4>
                         <p className="text-sm">{reviewData.overall_review.roadmap}</p>
                       </div>
                    </CardContent>
                  </Card>

                  {/* QUESTION BREAKDOWN */}
                  <div className="md:col-span-3 space-y-4 mt-8">
                     <h3 className="text-2xl font-bold font-heading px-2">Question Breakdown</h3>
                     {reviewData.question_wise_review.map((q: any, i: number) => (
                       <Card key={i} className="glass-card mb-4 border-border/40">
                         <CardHeader className="bg-card/50 pb-4">
                           <div className="flex justify-between items-start gap-4">
                             <CardTitle className="text-lg leading-snug">Q{i+1}: {q.question}</CardTitle>
                             <div className="text-center shrink-0">
                               <div className={`text-2xl font-black ${q.score >= 8 ? 'text-emerald-400' : q.score >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                                 {q.score}<span className="text-sm text-muted-foreground opacity-50">/10</span>
                               </div>
                             </div>
                           </div>
                         </CardHeader>
                         <CardContent className="p-6 grid md:grid-cols-2 gap-6 bg-background/50">
                            <div>
                               <h5 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-2">Answer Transcript Context</h5>
                               <p className="text-sm text-muted-foreground italic mb-5">"{q.user_answer_summary}"</p>
                               
                               <div className="space-y-4">
                                 <div className="flex items-start gap-3 text-sm">
                                   <div className="shrink-0 mt-1 bg-emerald-500/20 text-emerald-400 font-bold px-2 rounded text-xs uppercase tracking-wider block w-[100px] text-center">Correctness</div>
                                   <p className="text-emerald-400/90">{q.correctness}</p>
                                 </div>
                                 <div className="flex items-start gap-3 text-sm">
                                   <div className="shrink-0 mt-1 bg-cyan-500/20 text-cyan-400 font-bold px-2 rounded text-xs uppercase tracking-wider block w-[100px] text-center">Clarity</div>
                                   <p className="text-cyan-400/90">{q.clarity}</p>
                                 </div>
                                 <div className="flex items-start gap-3 text-sm">
                                   <div className="shrink-0 mt-1 bg-purple-500/20 text-purple-400 font-bold px-2 rounded text-xs uppercase tracking-wider block w-[100px] text-center">Depth</div>
                                   <p className="text-purple-400/90">{q.depth}</p>
                                 </div>
                               </div>
                            </div>
                            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                               <h5 className="text-xs font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                                 <AlertCircle className="w-4 h-4" /> How to Improve
                               </h5>
                               <p className="text-sm leading-relaxed text-card-foreground/90">{q.improve}</p>
                            </div>
                         </CardContent>
                       </Card>
                     ))}
                  </div>

                </div>
                
                <div className="flex justify-center mt-12 pb-12">
                   <Button onClick={() => setPhase("setup")} variant="outline" size="lg" className="px-12 h-14 rounded-full shadow-xl">
                      Start Another Session
                   </Button>
                </div>
              </div>
            )}
          </div>
        )}
          </TabsContent>
          <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <FeatureHistory 
               featureName="mock-interview-review" 
               onOpenRecord={handleHistoryOpen}
             />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
