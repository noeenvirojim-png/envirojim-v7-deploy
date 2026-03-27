-- 🛠️ ENVIROJIM V7.2: ADVANCED DIAGNOSTIC & WORK ORDERS MIGRATION

-- 1. ERROR CODES LIBRARY
CREATE TABLE IF NOT EXISTS error_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer TEXT NOT NULL CHECK (manufacturer IN ('CATERPILLAR', 'VOLVO_PENTA', 'CUMMINS')),
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    recommended_checks TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(manufacturer, code)
);

-- 2. WORK ORDERS (BON DE TRAVAIL)
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    machine_id UUID REFERENCES machines(id),
    technician_id UUID REFERENCES users(id),
    ticket_id UUID REFERENCES tickets(id),
    
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED')),
    
    -- AI Dictation Results
    raw_dictation TEXT,
    formatted_report JSONB, -- { problem: "", diagnostic: "", actions: [], results: "" }
    
    -- Timers (Minutes)
    transport_time_in INTEGER DEFAULT 0,
    transport_time_out INTEGER DEFAULT 0,
    intervention_time INTEGER DEFAULT 0,
    
    photos JSONB DEFAULT '[]', -- [ { url: "", legend: "", ai_tag: "" } ]
    pdf_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. DIAGNOSTIC SESSIONS (YES/NO TREE STATE)
CREATE TABLE IF NOT EXISTS diagnostic_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES machines(id),
    user_id UUID REFERENCES users(id),
    current_step INTEGER DEFAULT 1,
    history JSONB DEFAULT '[]',
    is_resolved BOOLEAN DEFAULT false,
    escalated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS POLICIES
ALTER TABLE error_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON error_codes FOR SELECT USING (true);

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Work Orders Org Isolation" ON work_orders 
    USING (organization_id = (select organization_id from users where id = auth.uid()));

ALTER TABLE diagnostic_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sessions Org Isolation" ON diagnostic_sessions 
    USING ( (select organization_id from machines where id = machine_id) = (select organization_id from users where id = auth.uid()) );
