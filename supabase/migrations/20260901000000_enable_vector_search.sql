-- Ensure pgvector is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Create HNSW index for bleeding-edge fast nearest-neighbor search
CREATE INDEX IF NOT EXISTS idx_posts_embedding 
ON public.posts USING hnsw (embedding vector_cosine_ops);

-- Create match_posts RPC
CREATE OR REPLACE FUNCTION match_posts (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  post_name text,
  post_description text,
  post_type text,
  similarity float
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    id,
    post_name,
    post_description,
    post_type,
    1 - (posts.embedding <=> query_embedding) AS similarity
  FROM posts
  WHERE 1 - (posts.embedding <=> query_embedding) > match_threshold
    AND is_active = true
  ORDER BY posts.embedding <=> query_embedding
  LIMIT match_count;
$$;
