-- Create cache table for API responses
CREATE TABLE IF NOT EXISTS public.api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_hash TEXT NOT NULL,
  data_type TEXT NOT NULL,
  cached_data JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(address_hash, data_type)
);

-- Enable RLS
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

-- Public read access for cache
CREATE POLICY "Public read access for cache" 
ON public.api_cache 
FOR SELECT 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_api_cache_lookup ON public.api_cache(address_hash, data_type, fetched_at);

-- Add comment
COMMENT ON TABLE public.api_cache IS 'Caches API responses from SF Open Data to improve performance';