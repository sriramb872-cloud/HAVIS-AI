-- Create History Table
CREATE TABLE public.history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    input_data JSONB DEFAULT '{}'::JSONB,
    output_data JSONB DEFAULT '{}'::JSONB,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for efficient user history retrieval and grouping
CREATE INDEX idx_history_user_date ON public.history (user_id, date DESC);
CREATE INDEX idx_history_created_at ON public.history (created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only select their own history
CREATE POLICY "Users can view their own history" 
ON public.history FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own history
CREATE POLICY "Users can insert their own history" 
ON public.history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users cannot modify history (append-only)
-- No UPDATE or DELETE policies created, thus disallowing updates/deletes implicitly.

-- Policy: Users can delete their own history records
CREATE POLICY "Users can delete their own history"
ON public.history FOR DELETE
USING (auth.uid() = user_id);
