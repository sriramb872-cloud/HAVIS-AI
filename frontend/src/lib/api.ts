export const API_HOST_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");

if (!API_HOST_URL) {
  throw new Error("VITE_API_URL is not set");
}

// Phase 4: Smart Prefixing — Avoid double /api/v1 if already in the environment variable
const API_BASE_URL = API_HOST_URL.endsWith("/api/v1") 
  ? API_HOST_URL 
  : `${API_HOST_URL}/api/v1`;
import { supabase } from "@/integrations/supabase/client";

export const apiClient = {
  async post(path: string, body: any) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error || errorData.message || `API error: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  async postForm(path: string, formData: FormData) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error || errorData.message || `API error: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  async get(path: string) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      headers,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error || `API error: ${response.statusText}`);
    }
    
    return await response.json();
  },

  async delete(path: string) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "DELETE",
      headers,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error || errorData.message || `API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
};

// Unified AI Assistant calls targeting the Python backend
export const aiApi = {
  // Generic features: Smart Notes, Resource Finder, AI Search
  async assistant(type: string, content: string, file?: File | null, extra?: any) {
    const formData = new FormData();
    formData.append("type", type);
    if (content) formData.append("content", content);
    if (file) formData.append("file", file);
    if (extra) formData.append("context", JSON.stringify(extra));
    
    return apiClient.postForm("/ai/assistant", formData);
  },
  
  // Resume Analyzer (Detailed Comparison)
  async analyzeResume(formData: FormData) {
    return apiClient.postForm("/ai/resume/analyze", formData);
  },

  // Interview Prep (Generation)
  async generateInterviewPrep(role: string, experience_level: string, tech_stack?: string) {
    return apiClient.post("/ai/interview/prep", { role, experience_level, tech_stack });
  },

  // AI Podcast (Conversation Script)
  async generatePodcast(topic: string, host_gender: string, guest_gender: string, file?: File | null) {
    const formData = new FormData();
    if (topic) formData.append("topic", topic);
    formData.append("host_gender", host_gender);
    formData.append("guest_gender", guest_gender);
    if (file) formData.append("file", file);
    
    return apiClient.postForm("/ai/podcast/generate", formData);
  },

  // ---- MOCK INTERVIEW SESSION ----
  async startMockInterview(role: string, difficulty: string, round_type: string, num_questions: number, interviewer_avatar: string) {
    return apiClient.post("/ai/mock-interview/start", { role, difficulty, round_type, num_questions, interviewer_avatar });
  },
  async nextMockInterviewTurn(session_id: string, user_answer: string) {
    return apiClient.post("/ai/mock-interview/next", { session_id, user_answer });
  },
  async getMockInterviewReview(formData: FormData) {
    return apiClient.postForm(`/ai/mock-interview/review`, formData);
  }
};

// ---- ADMIN OPERATIONS ----
export const adminApi = {
  // Verify if current user is an admin
  async check() {
    return apiClient.get("/admin/check");
  },
  
  // Get system overview statistics
  async getOverview() {
    return apiClient.get("/admin/overview");
  },
  
  // List all users
  async getUsers() {
    return apiClient.get("/admin/users");
  }
};

export const analyticsApi = {
  getSummary: () => apiClient.get("/admin/analytics/summary"),
  getByModule: () => apiClient.get("/admin/analytics/by-module"),
  getByEvent: () => apiClient.get("/admin/analytics/by-event"),
  getRecent: () => apiClient.get("/admin/analytics/recent"),
};
