import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const systemPrompts: Record<string, string> = {
  "smart-notes": `You are an AI study assistant. Given study notes, return a JSON object with:
- "summary": a 2-3 sentence summary
- "keyPoints": array of 4-5 key points
- "questions": array of 5 practice questions
- "flashcards": array of 5 objects with "front" (question/term) and "back" (answer/definition)
Return ONLY valid JSON, no markdown fences.`,

  "resume-analyzer": `You are a professional resume analyst. Given resume text, return a JSON object with:
- "score": number 0-100 rating the resume quality
- "strengths": array of 3-4 strengths
- "improvements": array of 3-4 improvement suggestions
- "missingSkills": array of 3-5 skills the candidate should add
Return ONLY valid JSON, no markdown fences.`,

  "interview-generator": `You are an interview prep coach. Given a job role, generate 8 interview questions. Return a JSON object with:
- "questions": array of objects with "q" (question text), "difficulty" ("Easy"|"Medium"|"Hard"), "category" (e.g. "Technical", "Behavioral", "Communication", "Cultural Fit")
Return ONLY valid JSON, no markdown fences.`,

  "mock-interview-start": `You are an interview coach. Given a job role, generate 5 interview questions of varying difficulty. Return a JSON object with:
- "questions": array of 5 question strings
Return ONLY valid JSON, no markdown fences.`,

  "mock-interview-evaluate": `You are an interview evaluator. You will receive a JSON with "question", "answer", and "role". Evaluate the answer and return a JSON object with:
- "score": number 1-10
- "strengths": array of 2-3 things the candidate did well
- "improvements": array of 2-3 areas to improve
- "betterAnswer": a suggested improved answer (2-3 sentences)
Return ONLY valid JSON, no markdown fences.`,

  "ai-podcast": `You are a creative podcast scriptwriter. Given learning material, convert it into an engaging podcast-style script with:
- An intro segment with Host and Co-Host
- 2-3 content segments breaking down the material
- Key takeaways segment
- An outro
Use **bold** for speaker names and segment headers. Make it conversational, educational, and engaging.
Return the script as plain text (not JSON).`,

  "resource-finder": `You are a learning resource curator. Given a topic, return a JSON object with:
- "resources": array of 6 objects with "title", "url" (use realistic placeholder URLs like https://example.com/...), "type" ("article"|"video"|"repo"|"course"), "description" (1-2 sentences)
Include a mix of types. Return ONLY valid JSON, no markdown fences.`,

  "task-priority": `You are a productivity assistant. Given a task description, determine its priority. Return a JSON object with:
- "priority": "High" or "Medium" or "Low"
- "reason": brief explanation of why this priority
Return ONLY valid JSON, no markdown fences.`,

  "quiz-generator": `You are a quiz generator for education. Given a topic, generate 5 multiple-choice questions. Return a JSON object with:
- "questions": array of objects with "question" (text), "options" (array of 4 strings), "correct" (index 0-3 of correct answer)
Make questions substantive and educational. Return ONLY valid JSON, no markdown fences.`,

  "ai-search": `You are a helpful, knowledgeable AI assistant inside a learning platform called BrainForge AI. Answer questions clearly, concisely, and helpfully. If the question is about programming, provide code examples. If about career advice, be practical. Format your response as plain text (not JSON). Use line breaks for readability.`,

  "study-planner": `You are a study planning assistant. Given topics and number of days, create a study plan. Return a JSON object with:
- "plan": array of objects with "day" (e.g. "Day 1 - Monday"), "topics" (array of topic strings), "duration" (e.g. "2 hours"), "tip" (a study tip for that day)
Return ONLY valid JSON, no markdown fences.`,

  "job-recommender": `You are a career advisor. Given a user's skills and experience, recommend 5 matching jobs. Return a JSON object with:
- "jobs": array of objects with "title", "matchScore" (number 0-100), "description" (1 sentence), "requiredSkills" (array of 3-5 strings), "salaryRange" (e.g. "$80k-$120k"), "growthOutlook" (e.g. "High demand, growing 15% annually")
Return ONLY valid JSON, no markdown fences.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, content } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = systemPrompts[type];
    if (!systemPrompt) throw new Error(`Unknown type: ${type}`);

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("Gateway error:", status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "";

    // For text-based types, return raw text
    if (type === "ai-podcast" || type === "ai-search") {
      return new Response(JSON.stringify({ result: aiContent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to parse JSON from response
    let parsed;
    try {
      const cleaned = aiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response as JSON:", aiContent);
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: aiContent }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
