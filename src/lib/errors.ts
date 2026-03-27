/**
 * Standardized Error Codes
 * 
 * Use these constants across all server actions for consistent error handling
 */

export const ErrorCodes = {
    // Authentication & Authorization
    AUTH_ERROR: 'AUTH_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    SESSION_EXPIRED: 'SESSION_EXPIRED',

    // Validation
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

    // File Upload
    INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
    INVALID_FILE_SIGNATURE: 'INVALID_FILE_SIGNATURE',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    UPLOAD_ERROR: 'UPLOAD_ERROR',

    // Database
    DB_ERROR: 'DB_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

    // Business Logic
    PART_NOT_FOUND: 'PART_NOT_FOUND',
    MACHINE_NOT_FOUND: 'MACHINE_NOT_FOUND',
    SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
    NODE_NOT_FOUND: 'NODE_NOT_FOUND',
    INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
    WORKFLOW_ERROR: 'WORKFLOW_ERROR',

    // System
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Standardized error response structure
 */
export interface ErrorResponse {
    success: false;
    error: string;
    code: ErrorCode;
    details?: Record<string, any>;
}

/**
 * Standardized success response structure
 */
export interface SuccessResponse<T = any> {
    success: true;
    data?: T;
    message?: string;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

/**
 * Create a standardized error response
 */
export function createError(
    code: ErrorCode,
    message: string,
    details?: Record<string, any>
): ErrorResponse {
    return {
        success: false,
        error: message,
        code,
        details,
    };
}

/**
 * Create a standardized success response
 */
export function createSuccess<T = any>(
    data?: T,
    message?: string
): SuccessResponse<T> {
    return {
        success: true,
        data,
        message,
    };
}
