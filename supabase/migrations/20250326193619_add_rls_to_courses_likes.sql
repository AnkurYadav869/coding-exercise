ALTER TABLE public.courses_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own liked courses"
ON public.courses_likes
FOR SELECT
USING (auth.uid() = user_id);