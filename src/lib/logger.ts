/**
 * Structured Logging Module
 * 
 * Provides structured logging for critical actions with consistent format
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export type LogEvent =
    // Authentication
    | 'auth.login.success'
    | 'auth.login.failure'
    | 'auth.logout'
    | 'auth.session.expired'
    // Machine
    | 'machine.created'
    | 'machine.updated'
    | 'machine.deleted'
    // Document
    | 'document.uploaded'
    | 'document.upload.failed'
    | 'document.deleted'
    // Part Request
    | 'part_request.created'
    | 'part_request.status_changed'
    | 'part_request.approved'
    | 'part_request.po_added'
    // Diagnostic
    | 'diagnostic.session_started'
    | 'diagnostic.session_updated'
    | 'diagnostic.session_completed'
    // Intervention
    | 'intervention.created'
    | 'intervention.completed'
    // Transaction
    | 'transaction.started'
    | 'transaction.committed'
    | 'transaction.rolled_back'
    // RBAC
    | 'rbac.access_granted'
    | 'rbac.access_denied'
    // Error
    | 'error.validation'
    | 'error.authorization'
    | 'error.database'
    | 'error.upload'
    // Pipeline
    | 'pipeline.started'
    | 'pipeline.success'
    | 'pipeline.error';

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    event: LogEvent;
    userId?: string;
    orgId?: string;
    metadata?: Record<string, any>;
    requestId?: string;
    error?: {
        message: string;
        code?: string;
        stack?: string;
    };
}

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Log a structured event
 */
export function log(
    level: LogLevel,
    event: LogEvent,
    metadata?: Record<string, any>,
    error?: Error
): void {
    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        event,
        metadata,
    };

    if (error) {
        entry.error = {
            message: error.message,
            code: (error as any).code,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        };
    }

    // In production, this would send to a logging service (e.g., Datadog, LogDNA)
    // For now, we use structured console logging
    const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    logFn(JSON.stringify(entry, null, process.env.NODE_ENV === 'development' ? 2 : 0));
}

/**
 * Log info event
 */
export function logInfo(event: LogEvent, metadata?: Record<string, any>): void {
    log('info', event, metadata);
}

/**
 * Log warning event
 */
export function logWarn(event: LogEvent, metadata?: Record<string, any>): void {
    log('warn', event, metadata);
}

/**
 * Log error event
 */
export function logError(event: LogEvent, error: Error, metadata?: Record<string, any>): void {
    log('error', event, metadata, error);
}

/**
 * Log authentication event
 */
export function logAuth(
    success: boolean,
    userId?: string,
    email?: string,
    error?: Error
): void {
    const event: LogEvent = success ? 'auth.login.success' : 'auth.login.failure';
    log(
        success ? 'info' : 'warn',
        event,
        { userId, email },
        error
    );
}

/**
 * Log machine creation
 */
export function logMachineCreated(
    machineId: string,
    userId: string,
    orgId: string,
    serialNumber: string
): void {
    logInfo('machine.created', {
        machineId,
        userId,
        orgId,
        serialNumber,
    });
}

/**
 * Log document upload
 */
export function logDocumentUploaded(
    documentId: string,
    machineId: string,
    userId: string,
    fileSize: number,
    fileType: string
): void {
    logInfo('document.uploaded', {
        documentId,
        machineId,
        userId,
        fileSize,
        fileType,
    });
}

/**
 * Log part request creation
 */
export function logPartRequestCreated(
    requestId: string,
    machineId: string,
    userId: string,
    itemCount: number
): void {
    logInfo('part_request.created', {
        requestId,
        machineId,
        userId,
        itemCount,
    });
}

/**
 * Log part request status change
 */
export function logPartRequestStatusChanged(
    requestId: string,
    oldStatus: string,
    newStatus: string,
    userId: string
): void {
    logInfo('part_request.status_changed', {
        requestId,
        oldStatus,
        newStatus,
        userId,
    });
}

/**
 * Log diagnostic session
 */
export function logDiagnosticSession(
    action: 'started' | 'updated' | 'completed',
    sessionId: string,
    userId: string,
    machineId?: string
): void {
    const eventMap = {
        started: 'diagnostic.session_started' as LogEvent,
        updated: 'diagnostic.session_updated' as LogEvent,
        completed: 'diagnostic.session_completed' as LogEvent,
    };

    logInfo(eventMap[action], {
        sessionId,
        userId,
        machineId,
    });
}
