/**
 * EnviroJim V6 - Canonical TypeScript Types
 * 
 * ALIGNED WITH: DEPLOY_V6_PRODUCTION_PERFECT.sql
 * DATE: 2026-02-13
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            organizations: {
                Row: Organization
                Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Omit<Organization, 'id'>>
            }
            users: {
                Row: User
                Insert: User
                Update: Partial<User>
            }
            machines: {
                Row: Machine
                Insert: Omit<Machine, 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Omit<Machine, 'id'>>
            }
            tickets: {
                Row: Ticket
                Insert: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Omit<Ticket, 'id'>>
            }
            // Add other tables as needed for dbMapper types
        }
    }
}

// --- ENUMS ---

export type OrgType = 'ENVIROJIM' | 'SERVICE_PROVIDER' | 'CLIENT';

// Strict Roles from DIRECTIVE GEMINI V6
export type UserRole =
    | 'SUPER_ADMIN'
    | 'ENVIROJIM_ADMIN'
    | 'DEALER_ADMIN'
    | 'SERVICE_PROVIDER_ADMIN'
    | 'CLIENT_ADMIN'
    | 'TECHNICIAN'
    | 'OPERATOR';

// Workflow Standardized Statuses
export type RequestStatus = 'draft' | 'pending_approval' | 'approved' | 'quoted' | 'ordered' | 'delivered';
export type TicketStatus = 'open' | 'diagnosing' | 'waiting_parts' | 'scheduled' | 'in_progress' | 'completed' | 'closed';
export type WorkOrderStatus = 'scheduled' | 'in_progress' | 'awaiting_parts' | 'completed' | 'validated';

export type RequestUrgency = 'NORMAL' | 'HIGH' | 'EMERGENCY';
export type DocumentType = 'MANUAL' | 'SPEC_SHEET' | 'SERVICE_REPORT' | 'INVOICE';
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type OutcomeType = 'REPAIR_NEEDED' | 'REPLACEMENT_NEEDED' | 'MONITOR_ONLY' | 'RESOLVED';
export type ChecklistStatus = 'DRAFT' | 'COMPLETED' | 'FLAGGED';
export type RfqStatus = 'DRAFT' | 'SENT' | 'QUOTED' | 'EXPIRED' | 'CANCELLED';
export type ProcessingStatus = 'UPLOADED' | 'PROCESSING' | 'INDEXED' | 'FAILED';

export type MaintenanceAlertLevel = 'NORMAL' | 'WARNING' | 'CRITICAL';
export type InternalTicketStatus = 'OPEN' | 'IN_REVIEW' | 'TRANSFERRED' | 'CLOSED';
export type ChecklistType = 'MORNING' | 'EVENING' | 'CUSTOM';

// --- INTERFACES ---

export interface BaseEntity {
    id: string;
    created_at: Date | string;
    updated_at: Date | string;
    deleted_at?: Date | string | null;
}

export interface Organization extends BaseEntity {
    name: string;
    type: OrgType;
    parent_id?: string | null;
    qb_customer_id?: string | null;
}

export interface User extends BaseEntity {
    organization_id: string;
    role: UserRole;
    email: string;
    full_name: string;
}

export interface Site extends BaseEntity {
    organization_id: string;
    name: string;
}

export interface Machine extends BaseEntity {
    organization_id: string;
    site_id?: string | null;
    assigned_partner_id?: string | null;
    serial_number: string;
    make: string;
    model: string;
    year?: number | null;
    current_hours: number;
    engine_make?: string | null;
    engine_serial?: string | null;
    // V7.2 Extended Technical Data
    engine_model?: string | null;
    engine_registration_date?: string | null;
    shafts_config?: string | null;
    // Sales & Logistics
    sale_date?: string | null;
    po_number?: string | null;
    supplier?: string | null;
    quotation_number?: string | null;
    invoice_number?: string | null;
    client_invoice_url?: string | null;
    transport_type?: string | null;
    tracking_number?: string | null;
    notes?: string | null;
    parts_description?: string | null;
}

export interface PartCatalogItem extends BaseEntity {
    part_number: string;
    name: string;
    description?: string | null;
    category?: string | null;
    price: number;
}

export interface PartRequest extends BaseEntity {
    organization_id: string;
    machine_id: string;
    requester_user_id: string;
    urgency: RequestUrgency;
    status: RequestStatus;
    client_po_number?: string | null;
    shipping_address?: string | null;
    notes?: string | null;
    // Joined data
    items?: PartRequestItem[];
}

export interface PartRequestItem {
    id: string;
    request_id: string;
    part_catalog_id?: string | null;
    part_number_snapshot?: string | null;
    part_name_snapshot?: string | null;
    quantity_requested: number;
    price_unit_cost?: number | null;
    created_at: Date | string;
}

export type InterventionStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Intervention extends BaseEntity {
    organization_id: string;
    machine_id: string;
    ticket_id?: string | null;
    part_request_id?: string | null;
    technician_name: string; // From stub
    technician_user_id?: string | null;
    intervention_type: string; // From stub
    work_description: string;
    status: InterventionStatus;
    planned_date: Date | string; // From stub
    realized_date?: Date | string | null; // From stub
    notes?: string | null; // From stub
    pieces_used?: string | null; // From stub
    pdf_url?: string | null; // From stub
    is_completed?: boolean;
    scheduled_at?: Date | string | null;
    completed_at?: Date | string | null;
    // Joined data
    machine?: Machine;
}

export interface InterventionPart {
    id: string;
    intervention_id: string;
    part_id: string;
    quantity: number;
    created_at: Date | string;
}

export interface Ticket extends BaseEntity {
    organization_id: string;
    machine_id?: string | null;
    created_by: string;
    assigned_to?: string | null;
    title: string;
    description?: string | null;
    status: TicketStatus;
    priority: TicketPriority;
    resolved_at?: Date | string | null;
    // Joined data
    machine?: Machine;
    user?: User;
}

export interface DiagnosticNode {
    id: string;
    parent_node_id?: string | null;
    question_text: string;
    is_leaf: boolean;
    options: any; // JSONB
    outcome_type?: OutcomeType | null;
    outcome_text?: string | null;
    deleted_at?: Date | string | null;
    created_at: Date | string;
}

export interface DiagnosticSession {
    id: string;
    organization_id: string;
    user_id: string;
    machine_id: string;
    path: any; // JSONB
    outcome?: string | null;
    deleted_at?: Date | string | null;
    created_at: Date | string;
}

export interface MaintenanceDefinition extends BaseEntity {
    organization_id: string;
    machine_id: string;
    task_name: string;
    interval_hours: number;
    description?: string | null;
}

export interface MaintenanceRule extends BaseEntity {
    organization_id: string;
    machine_id?: string | null;
    maintenance_definition_id: string;
    last_performed_at?: Date | string | null;
    next_due_at?: Date | string | null;
    is_active: boolean;
    alert_lead_hours: number; // ex: 150
    alert_level: MaintenanceAlertLevel;
}

export interface ChecklistTemplate {
    id: string;
    organization_id: string;
    machine_id?: string | null;
    name: string;
    items: any; // JSONB
    created_at: Date | string;
    updated_at: Date | string;
}

export interface Checklist {
    id: string;
    organization_id: string;
    machine_id: string;
    template_id: string;
    technician_user_id: string;
    status: ChecklistStatus;
    is_compliant: boolean;
    engine_hours_input?: number | null;
    created_at: Date | string;
    updated_at: Date | string;
}

export interface Rfq {
    id: string;
    organization_id: string;
    request_id?: string | null;
    supplier_email?: string | null;
    status: RfqStatus;
    sent_at?: Date | string | null;
    expires_at?: Date | string | null;
    created_at: Date | string;
}

export interface SupplierQuote {
    id: string;
    rfq_id: string;
    supplier_name: string;
    total_amount: number;
    currency: string;
    quote_file_url?: string | null;
    is_selected: boolean;
    created_at: Date | string;
}

export interface Manual {
    id: string;
    organization_id: string;
    machine_id?: string | null;
    title: string;
    file_url: string;
    processing_status: ProcessingStatus;
    created_at: Date | string;
}

export interface Document extends BaseEntity {
    organization_id: string;
    machine_id?: string | null;
    title: string;
    type: DocumentType;
    file_url: string;
}

export type InternalOrderStatus = 
    | 'REQUEST_ENTRY' 
    | 'QUOTE_CREATED' 
    | 'ORDER_TRANSMITTED' 
    | 'IN_TRANSIT' 
    | 'RECEIVED_INTERNAL' 
    | 'DELIVERED_FINAL';

export type ClientOrderStatus = 
    | 'REQUEST_INITIAL' 
    | 'QUOTATION_SENT' 
    | 'PO_CONFIRMED' 
    | 'DELIVERY_PENDING' 
    | 'RECEIVED_CLIENT';

export interface AuditLog {
    id: string;
    table_name: string;
    record_id: string;
    action_type: string;
    changed_by?: string | null;
    changed_at: Date | string;
    old_data?: any | null;
    new_data?: any | null;
}

export interface PartOrder extends BaseEntity {
    organization_id: string;
    machine_id: string;
    description_fuzzy: string;
    quantity: number;
    part_catalog_id?: string | null;
    qb_quote_number?: string | null;
    invoice_number?: string | null;
    quote_pdf_url?: string | null;
    invoice_pdf_url?: string | null;
    internal_status: InternalOrderStatus;
    client_status: ClientOrderStatus;
    destination_type: 'CLIENT' | 'STOCK';
    transport_type: 'LOCAL' | 'US' | 'INTERNATIONAL' | 'CANADA';
    tracking_number?: string | null;
    weight?: string | null;
    dimensions?: string | null;
    transport_cost?: number | null;
    transport_price_quote?: number | null;
    pickup_date?: Date | string | null;
    intl_departure_date?: Date | string | null;
    intl_arrival_date?: Date | string | null;
    final_delivery_date?: Date | string | null;
    internal_notes?: string | null;
    client_notes?: string | null;
    email_sent: boolean;
    // Joined data
    machine?: Machine;
}

export interface ChecklistInstance extends BaseEntity {
    organization_id: string;
    machine_id: string;
    type: ChecklistType;
    status: ChecklistStatus;
    items: ChecklistInstanceItem[];
    completed_at?: Date | string | null;
    technician_id: string;
}

export interface ChecklistInstanceItem {
    id: string;
    text: string;
    is_checked: boolean;
    photo_urls: string[];
    note?: string | null;
}

export interface InternalTicket extends BaseEntity {
    organization_id: string;
    machine_id: string;
    creator_id: string;
    supervisor_id?: string | null;
    title: string;
    description: string;
    status: InternalTicketStatus;
    notes_vocal: NotesVocal[];
    supervisor_notes: string[];
    is_transferred_to_envirojim: boolean;
}

export type TransportStatus = 'PENDING' | 'IN_TRANSIT' | 'DELAYED' | 'DELIVERED' | 'CANCELLED';

export interface Transport extends BaseEntity {
    organization_id: string;
    machine_id?: string | null;
    order_id?: string | null; // Can be linked to PartOrder
    transporter_name: string;
    carrier_reference?: string | null;
    tracking_url?: string | null;
    status: TransportStatus;
    origin?: string | null;
    destination?: string | null;
    pickup_date_est?: Date | string | null;
    pickup_date_act?: Date | string | null;
    delivery_date_est?: Date | string | null;
    delivery_date_act?: Date | string | null;
    internal_notes?: string | null;
    driver_notes?: string | null;
    voice_note_id?: string | null;
    // Joined data
    machine?: Machine;
}

export interface NotesVocal extends BaseEntity {
    ticket_id?: string | null;
    checklist_id?: string | null;
    transport_id?: string | null;
    audio_url: string;
    transcription: string;
    formatted_text: string;
}


