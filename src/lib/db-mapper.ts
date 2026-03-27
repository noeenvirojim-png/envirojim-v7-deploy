/**
 * DB Mapper: TS ↔ SQL Mapping
 * 
 * Centralizes the translation between database (Snake Case) and frontend.
 * Fixes drifts: org_id -> organization_id, etc.
 */

import { Database, UserRole, TicketStatus, TicketPriority } from '@/types/schema';
import { assert } from './runtime-assert';
import { logError } from './logger';

export type DBRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

/**
 * Crash Guard: Safe fallback for nullable fields
 * Use only for non-critical display fields.
 */
function safe<T>(val: any, fallback: T): T {
    return (val === null || val === undefined) ? fallback : val;
}

/**
 * Strict Mapping Guard: Logs and throws if data is missing critical fields
 */
function enforce<T>(val: T | null | undefined, fieldName: string, context: string): T {
    if (val === null || val === undefined || (typeof val === 'string' && val === '')) {
        const error = new Error(`MAPPER_VIOLATION: Missing required field [${fieldName}] in [${context}]`);
        logError('error.validation', error, { fieldName, context });
        throw error;
    }
    return val;
}

export const dbMapper = {
    /**
     * Maps a database organization record
     */
    mapOrganization: (row: any) => ({
        id: enforce(row.id, 'id', 'Organization'),
        name: safe(row.name, 'Unnamed Organization'),
        type: enforce(row.type, 'type', 'Organization'),
        parentId: row.parent_id,
        createdAt: enforce(row.created_at, 'created_at', 'Organization'),
        updatedAt: safe(row.updated_at, row.created_at),
    }),

    /**
     * Maps a database user record
     */
    mapUser: (row: any) => {
        const userId = enforce(row.id, 'id', 'User');
        const organizationId = enforce(row.organization_id || row.org_id, 'organization_id', `User(${userId})`);
        const role = enforce(row.role, 'role', `User(${userId})`) as UserRole;

        return {
            id: userId,
            organizationId,
            role,
            email: enforce(row.email, 'email', `User(${userId})`),
            fullName: safe(row.full_name, 'Unknown User'),
            createdAt: enforce(row.created_at, 'created_at', `User(${userId})`),
            updatedAt: safe(row.updated_at, row.created_at),
        };
    },

    /**
     * Maps a database machine record
     */
    mapMachine: (row: any) => {
        const id = enforce(row.id, 'id', 'Machine');
        // V6 REPAIR: Support both legacy organization_id and new owner_org_id for stability during migration
        const organizationId = enforce(row.owner_org_id || row.organization_id, 'owner_org_id', `Machine(${id})`);
        
        return {
            id,
            organizationId,
            assignedPartnerId: row.assigned_partner_id,
            siteId: row.site_id,
            serialNumber: enforce(row.serial_number, 'serial_number', `Machine(${id})`),
            make: safe(row.make, 'Generic'),
            model: safe(row.model, 'Model X'),
            year: row.year,
            currentHours: safe(row.current_hours, 0),
            engineMake: row.engine_make,
            engineSerial: row.engine_serial,
            createdAt: enforce(row.created_at, 'created_at', `Machine(${id})`),
            updatedAt: safe(row.updated_at, row.created_at),
            // Nested relations
            organization: (row.organizations || row.organization) ? {
                name: safe((row.organizations || row.organization).name, 'Unknown Organization')
            } : null,
            documents: Array.isArray(row.documents) ? row.documents.map((d: any) => ({
                id: d.id,
                title: d.title,
                fileUrl: d.file_url,
                type: d.document_type || d.type,
                createdAt: d.created_at
            })) : [],
            checklists: Array.isArray(row.checklists) ? row.checklists.map((c: any) => ({
                id: c.id,
                status: c.status,
                isCompliant: c.is_compliant,
                completedAt: c.completed_at,
                createdAt: c.created_at
            })) : []
        };
    },

    /**
     * Maps a database ticket record
     */
    mapTicket: (row: any) => {
        const id = enforce(row.id, 'id', 'Ticket');
        return {
            id,
            organizationId: enforce(row.organization_id || row.org_id, 'organization_id', `Ticket(${id})`),
            machineId: row.machine_id,
            createdBy: safe(row.created_by || row.creator_id, 'SYSTEM'),
            assignedTo: row.assigned_to,
            title: safe(row.title, 'No Title'),
            description: row.description,
            status: safe(row.status, 'OPEN') as TicketStatus,
            priority: safe(row.priority, 'NORMAL') as TicketPriority,
            resolvedAt: row.resolved_at,
            createdAt: enforce(row.created_at, 'created_at', `Ticket(${id})`),
            updatedAt: safe(row.updated_at, row.created_at),
        };
    },

    /**
     * Maps a part catalog record
     */
    mapPartCatalogItem: (row: any) => ({
        id: enforce(row.id, 'id', 'PartCatalogItem'),
        partNumber: enforce(row.part_number, 'part_number', 'PartCatalogItem'),
        name: safe(row.name, 'Unnamed Part'),
        description: row.description,
        category: row.category,
        price: safe(row.price, 0),
        createdAt: enforce(row.created_at, 'created_at', 'PartCatalogItem')
    }),

    /**
     * Maps a database part request record
     */
    mapPartRequest: (row: any) => {
        const id = enforce(row.id, 'id', 'PartRequest');
        return {
            id,
            organizationId: enforce(row.organization_id, 'organization_id', `PartRequest(${id})`),
            machineId: enforce(row.machine_id, 'machine_id', `PartRequest(${id})`),
            requesterId: enforce(row.requester_user_id, 'requester_user_id', `PartRequest(${id})`),
            status: safe(row.status, 'DRAFT'),
            urgency: safe(row.urgency, 'NORMAL'),
            clientPoNumber: row.client_po_number,
            createdAt: enforce(row.created_at, 'created_at', `PartRequest(${id})`),
            updatedAt: safe(row.updated_at, row.created_at),
            items: row.items ? row.items.map((item: any) => ({
                id: item.id,
                partNumber: item.part_number_snapshot,
                partName: item.part_name_snapshot,
                quantity: item.quantity_requested,
                price: item.price_unit_cost
            })) : []
        };
    },

    /**
     * Maps a database intervention record
     */
    mapIntervention: (row: any) => {
        const id = enforce(row.id, 'id', 'Intervention');
        return {
            id,
            organizationId: enforce(row.organization_id, 'organization_id', `Intervention(${id})`),
            machineId: enforce(row.machine_id, 'machine_id', `Intervention(${id})`),
            technicianId: enforce(row.technician_user_id, 'technician_user_id', `Intervention(${id})`),
            workDescription: safe(row.work_description, ''),
            isCompleted: safe(row.is_completed, false),
            completedAt: row.completed_at,
            createdAt: enforce(row.created_at, 'created_at', `Intervention(${id})`),
            updatedAt: safe(row.updated_at, row.created_at),
            machine: row.machine ? {
                id: row.machine.id,
                make: safe(row.machine.make, 'Unknown'),
                model: safe(row.machine.model, 'Unknown'),
                serialNumber: safe(row.machine.serial_number, 'Unknown')
            } : null,
            technician: row.technician ? {
                id: row.technician.id,
                fullName: safe(row.technician.full_name, 'Unknown Technician'),
                email: safe(row.technician.email, '')
            } : null
        };
    },

    /**
     * Maps a database RFQ record
     */
    mapRfq: (row: any) => ({
        id: enforce(row.id, 'id', 'RFQ'),
        organizationId: enforce(row.organization_id, 'organization_id', 'RFQ'),
        requestId: row.request_id,
        supplierEmail: safe(row.supplier_email, ''),
        status: safe(row.status, 'DRAFT'),
        sentAt: row.sent_at,
        expiresAt: row.expires_at,
        createdAt: enforce(row.created_at, 'created_at', 'RFQ'),
    }),

    /**
     * Maps a database maintenance rule record
     */
    mapMaintenanceRule: (row: any) => ({
        id: enforce(row.id, 'id', 'MaintenanceRule'),
        organizationId: enforce(row.organization_id, 'organization_id', 'MaintenanceRule'),
        machineId: row.machine_id,
        definitionId: enforce(row.maintenance_definition_id, 'maintenance_definition_id', 'MaintenanceRule'),
        lastPerformedAt: row.last_performed_at,
        nextDueAt: row.next_due_at,
        isActive: safe(row.is_active, true),
        createdAt: enforce(row.created_at, 'created_at', 'MaintenanceRule'),
        updatedAt: safe(row.updated_at, row.created_at),
    }),

    /**
     * Map Audit Log
     */
    mapAuditLog: (row: any) => ({
        id: enforce(row.id, 'id', 'AuditLog'),
        tableName: enforce(row.table_name, 'table_name', 'AuditLog'),
        recordId: enforce(row.record_id, 'record_id', 'AuditLog'),
        actionType: enforce(row.action_type, 'action_type', 'AuditLog'),
        changedBy: row.changed_by,
        changedAt: enforce(row.changed_at, 'changed_at', 'AuditLog'),
        oldData: row.old_data,
        newData: row.new_data
    })
};
