-- Create table for dynamic pricing configuration
CREATE TABLE IF NOT EXISTS public.pricing_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_category TEXT NOT NULL UNIQUE, -- e.g., 'Regular', 'Executive', 'Luxury'
    base_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    price_per_km NUMERIC(12, 2) NOT NULL DEFAULT 0,
    rounding_multiple INTEGER DEFAULT 1000, -- e.g., round to nearest 1000
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial data
INSERT INTO public.pricing_configs (service_category, base_price, price_per_km, rounding_multiple)
VALUES 
('Regular', 25000, 1500, 1000),
('Executive', 50000, 2500, 1000),
('Luxury', 100000, 5000, 1000)
ON CONFLICT (service_category) DO NOTHING;
