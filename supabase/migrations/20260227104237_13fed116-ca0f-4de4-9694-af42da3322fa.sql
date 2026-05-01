CREATE TABLE public.share_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id text NOT NULL,
  tactic_id text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('high', 'medium', 'low', 'scratch')),
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (share_id, tactic_id)
);

ALTER TABLE public.share_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can upsert feedback (no auth required for reviewers)
CREATE POLICY "Anyone can insert feedback" ON public.share_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update feedback" ON public.share_feedback FOR UPDATE USING (true);
CREATE POLICY "Anyone can view feedback" ON public.share_feedback FOR SELECT USING (true);