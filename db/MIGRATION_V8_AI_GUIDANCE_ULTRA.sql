-- 🛠️ ENVIROJIM V8: AI INDUSTRIAL GUIDANCE ENGINE (ULTRA SECURE)

-- 1. DIAGNOSTIC TREES
CREATE TABLE IF NOT EXISTS diagnostic_trees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    tree_version INTEGER DEFAULT 1,
    symptom TEXT NOT NULL,
    tree_structure_json JSONB NOT NULL, -- The hierarchical YES/NO structure
    confidence_score DECIMAL(3, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TRAINING MODULES
CREATE TABLE IF NOT EXISTS training_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    module_title TEXT NOT NULL,
    module_json JSONB NOT NULL,
    difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. MAINTENANCE PROCEDURES
CREATE TABLE IF NOT EXISTS maintenance_procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    procedure_title TEXT NOT NULL,
    procedure_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. REPAIR HISTORY (For Self-Learning)
CREATE TABLE IF NOT EXISTS repair_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES users(id),
    reported_symptom TEXT NOT NULL,
    diagnosed_cause TEXT NOT NULL,
    replaced_parts JSONB DEFAULT '[]', -- [{part_number: "", name: "", qty: 1}]
    repair_steps TEXT[] DEFAULT '{}',
    repair_success BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. FAILURE PATTERNS (Predictive)
CREATE TABLE IF NOT EXISTS failure_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    symptom TEXT NOT NULL,
    most_common_cause TEXT NOT NULL,
    recommended_parts JSONB DEFAULT '[]',
    confidence_score DECIMAL(3, 2) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(machine_id, symptom)
);

-- 6. GUIDANCE SESSIONS (Persistence)
CREATE TABLE IF NOT EXISTS guidance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL CHECK (session_type IN ('diagnostic', 'training', 'procedure')),
    current_step TEXT DEFAULT 'START',
    session_state_json JSONB DEFAULT '{}',
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS POLICIES
ALTER TABLE diagnostic_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE failure_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE guidance_sessions ENABLE ROW LEVEL SECURITY;

-- Dynamic Organization-based RLS via Machine Ownership
CREATE POLICY "Diagnostic Trees Org Isolation" ON diagnostic_trees
    USING ( (select organization_id from machines where id = machine_id) = (select organization_id from users where id = auth.uid()) );

CREATE POLICY "Training Modules Org Isolation" ON training_modules
    USING ( (select organization_id from machines where id = machine_id) = (select organization_id from users where id = auth.uid()) );

CREATE POLICY "Maintenance Procedures Org Isolation" ON maintenance_procedures
    USING ( (select organization_id from machines where id = machine_id) = (select organization_id from users where id = auth.uid()) );

CREATE POLICY "Repair History Org Isolation" ON repair_history
    USING ( (select organization_id from machines where id = machine_id) = (select organization_id from users where id = auth.uid()) );

CREATE POLICY "Failure Patterns Org Isolation" ON failure_patterns
    USING ( (select organization_id from machines where id = machine_id) = (select organization_id from users where id = auth.uid()) );

CREATE POLICY "Guidance Sessions User Isolation" ON guidance_sessions
    USING ( user_id = auth.uid() );
