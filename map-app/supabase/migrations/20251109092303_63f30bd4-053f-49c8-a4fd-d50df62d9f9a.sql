-- Create tables to cache SF civic data

-- Addresses table for search and caching
CREATE TABLE IF NOT EXISTS public.sf_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL UNIQUE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  neighborhood TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Permits data
CREATE TABLE IF NOT EXISTS public.permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_id UUID REFERENCES public.sf_addresses(id) ON DELETE CASCADE,
  permit_number TEXT UNIQUE,
  permit_type TEXT,
  description TEXT,
  status TEXT,
  filed_date DATE,
  issued_date DATE,
  completed_date DATE,
  estimated_cost DECIMAL(12, 2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 311 Complaints data
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_id UUID REFERENCES public.sf_addresses(id) ON DELETE CASCADE,
  case_id TEXT UNIQUE,
  category TEXT,
  request_type TEXT,
  description TEXT,
  status TEXT,
  priority TEXT,
  opened_date TIMESTAMPTZ,
  closed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Business registrations
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_id UUID REFERENCES public.sf_addresses(id) ON DELETE CASCADE,
  business_name TEXT,
  dba_name TEXT,
  business_type TEXT,
  status TEXT,
  registration_date DATE,
  closed_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Property data
CREATE TABLE IF NOT EXISTS public.property_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_id UUID REFERENCES public.sf_addresses(id) ON DELETE CASCADE,
  assessed_value DECIMAL(12, 2),
  year_built INTEGER,
  square_feet INTEGER,
  bedrooms INTEGER,
  bathrooms DECIMAL(3, 1),
  last_sale_date DATE,
  last_sale_price DECIMAL(12, 2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_permits_address ON public.permits(address_id);
CREATE INDEX IF NOT EXISTS idx_complaints_address ON public.complaints(address_id);
CREATE INDEX IF NOT EXISTS idx_businesses_address ON public.businesses(address_id);
CREATE INDEX IF NOT EXISTS idx_property_address ON public.property_data(address_id);
CREATE INDEX IF NOT EXISTS idx_addresses_location ON public.sf_addresses(latitude, longitude);

-- Enable Row Level Security
ALTER TABLE public.sf_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_data ENABLE ROW LEVEL SECURITY;

-- Public read access (civic data is public record)
CREATE POLICY "Public read access for addresses" ON public.sf_addresses FOR SELECT USING (true);
CREATE POLICY "Public read access for permits" ON public.permits FOR SELECT USING (true);
CREATE POLICY "Public read access for complaints" ON public.complaints FOR SELECT USING (true);
CREATE POLICY "Public read access for businesses" ON public.businesses FOR SELECT USING (true);
CREATE POLICY "Public read access for property data" ON public.property_data FOR SELECT USING (true);