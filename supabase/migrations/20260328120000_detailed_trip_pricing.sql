-- Migration to support comprehensive pricing components and audit logs
CREATE TABLE IF NOT EXISTS public.trip_pricing_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    transport_cost NUMERIC(12, 2) DEFAULT 0,
    accommodation_cost NUMERIC(12, 2) DEFAULT 0,
    meal_cost NUMERIC(12, 2) DEFAULT 0,
    attraction_tickets_cost NUMERIC(12, 2) DEFAULT 0,
    guide_fee NUMERIC(12, 2) DEFAULT 0,
    other_costs NUMERIC(12, 2) DEFAULT 0,
    markup_percentage NUMERIC(5, 2) DEFAULT 10.00, -- 10% default markup
    tax_percentage NUMERIC(5, 2) DEFAULT 11.00, -- 11% PPN default
    total_cost NUMERIC(12, 2) DEFAULT 0,
    final_price_per_pax NUMERIC(12, 2) DEFAULT 0,
    min_margin_percentage NUMERIC(5, 2) DEFAULT 5.00,
    is_margin_valid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pricing_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES auth.users(id),
    old_data JSONB,
    new_data JSONB,
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_trip_pricing_trip_id ON public.trip_pricing_details(trip_id);
CREATE INDEX IF NOT EXISTS idx_pricing_audit_trip_id ON public.pricing_audit_logs(trip_id);
