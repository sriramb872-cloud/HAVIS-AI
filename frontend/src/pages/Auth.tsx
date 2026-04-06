import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import logo from "../assets/logo-transparent.png";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Successfully logged in.");
        navigate("/");
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Account created successfully. Please check your email.");
        if (data.session) navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none opacity-50" />
      <div className="absolute top-1/2 left-10 w-72 h-72 bg-accent/20 rounded-full blur-3xl pointer-events-none opacity-40" />
      
      <Card className="w-full max-w-md shadow-2xl glass-card border-primary/20 backdrop-blur-xl relative z-10 animate-in fade-in zoom-in duration-500">
        <CardHeader className="text-center space-y-2 pb-6 border-b border-border/50">
          <div className="flex flex-col items-center gap-1.5 mb-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30 flex items-center justify-center">
              <img
                src={logo}
                alt="HAVIS AI Logo"
                className="w-11 h-11 object-contain mix-blend-screen brightness-110 drop-shadow-md"
              />
            </div>
            <span className="font-heading font-bold text-sm tracking-tight text-primary uppercase">HAVIS AI</span>
          </div>
          <CardTitle className="text-3xl font-heading font-bold">{isLogin ? "Welcome Back" : "Create Account"}</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            {isLogin ? "Sign in to your account." : "Join HAVIS AI today."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground ml-1">Email Address</label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-background/50 border-border/80 focus:border-primary/50 text-base"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground ml-1">Password</label>
              <Input
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-background/50 border-border/80 focus:border-primary/50 text-base"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 gradient-primary text-primary-foreground font-bold text-[15px] shadow-lg hover:shadow-primary/25 transition-all outline-none"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isLogin ? "Sign In" : "Sign Up")}
            </Button>
          </form>
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up here." : "Already have an account? Sign in here."}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
