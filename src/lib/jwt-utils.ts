/**
 * JWT Claims Utilities
 * 
 * Centralized utilities for extracting and validating JWT claims
 * from Supabase access tokens.
 * 
 * This eliminates the need to query the database for user role and org_id
 * on every request, improving performance and eliminating RLS circular dependencies.
 */

import { createClient } from '@/lib/supabase/server'

/**
 * JWT Claims structure returned by custom_access_token_hook
 */
export interface JWTClaims {
    org_id: string | null
    role: string | null
    user_metadata?: {
        org_id?: string
        role?: string
        full_name?: string
        email?: string
    }
}

/**
 * Decoded JWT structure from Supabase
 */
interface DecodedJWT {
    sub: string // user_id
    email?: string
    role?: string
    org_id?: string
    organization_id?: string
    app_metadata?: {
        role?: string
        org_id?: string
        organization_id?: string
    }
    user_metadata?: {
        org_id?: string
        organization_id?: string
        role?: string
        full_name?: string
        email?: string
    }
    aud?: string
    exp?: number
    iat?: number
}

/**
 * Extract all custom claims from current session's JWT
 * 
 * @returns JWT claims object or null if no session
 */
export async function getJWTClaims(): Promise<JWTClaims | null> {
    try {
        const supabase = createClient()
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session?.access_token) {
            console.warn('[JWT] No active session or access token')
            return null
        }

        // Decode JWT (Supabase tokens are base64 encoded, not encrypted)
        const decoded = decodeJWT(session.access_token)

        if (!decoded) {
            console.error('[JWT] Failed to decode access token')
            return null
        }

        // Extract claims (prefer top-level, then app_metadata, then user_metadata)
        const claims: JWTClaims = {
            org_id:
                decoded.org_id ||
                decoded.organization_id ||
                decoded.app_metadata?.organization_id ||
                decoded.app_metadata?.org_id ||
                decoded.user_metadata?.organization_id ||
                decoded.user_metadata?.org_id ||
                null,
            role:
                decoded.role ||
                decoded.app_metadata?.role ||
                decoded.user_metadata?.role ||
                null,
            user_metadata: decoded.user_metadata
        }

        return claims
    } catch (error) {
        console.error('[JWT] Error extracting claims:', error)
        return null
    }
}

/**
 * Get user role from JWT claims
 * 
 * @returns User role or null if not found
 */
export async function getRoleFromJWT(): Promise<string | null> {
    const claims = await getJWTClaims()
    return claims?.role || null
}

/**
 * Get organization ID from JWT claims
 * 
 * @returns Organization UUID or null if not found
 */
export async function getOrgIdFromJWT(): Promise<string | null> {
    const claims = await getJWTClaims()
    return claims?.org_id || null
}

/**
 * Validate that JWT claims contain required fields
 * 
 * @param claims - JWT claims object
 * @returns true if valid, false otherwise
 */
export function validateJWTClaims(claims: JWTClaims | null): boolean {
    if (!claims) {
        return false
    }

    if (!claims.role) {
        return false
    }

    // org_id can be 'NO_ORG' or a UUID. 
    // We only fail if it's completely missing or null.
    if (!claims.org_id) {
        return false
    }

    return true
}

/**
 * Check if user has a specific role (from JWT claims)
 * 
 * @param role - Role or array of roles to check
 * @returns true if user has role, false otherwise
 */
export async function hasRoleJWT(role: string | string[]): Promise<boolean> {
    const userRole = await getRoleFromJWT()

    if (!userRole) return false

    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(userRole)
}

/**
 * Check if user is admin (any admin role) from JWT claims
 * 
 * @returns true if user is admin, false otherwise
 */
export async function isAdminJWT(): Promise<boolean> {
    return hasRoleJWT([
        'SUPER_ADMIN',
        'ENVIROJIM_ADMIN',
        'DEALER_ADMIN',
        'SERVICE_PROVIDER_ADMIN',
        'CLIENT_ADMIN'
    ])
}

/**
 * Check if user is super admin from JWT claims
 * 
 * @returns true if user is super admin, false otherwise
 */
export async function isSuperAdminJWT(): Promise<boolean> {
    return hasRoleJWT('SUPER_ADMIN')
}

/**
 * Decode JWT token (simple base64 decode, no signature verification)
 * 
 * Note: Signature verification is handled by Supabase on every request.
 * This function is only for extracting claims from an already-validated token.
 * 
 * @param token - JWT access token
 * @returns Decoded JWT payload or null if invalid
 */
function decodeJWT(token: string): DecodedJWT | null {
    try {
        // JWT format: header.payload.signature
        const parts = token.split('.')

        if (parts.length !== 3) {
            console.error('[JWT] Invalid token format (expected 3 parts)')
            return null
        }

        // Decode payload (second part)
        const payload = parts[1]

        // Base64 URL decode (Edge compatible)
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
        const decoded = atob(base64)

        return JSON.parse(decoded) as DecodedJWT
    } catch (error) {
        console.error('[JWT] Error decoding token:', error)
        return null
    }
}

/**
 * Get user ID from current session (lightweight, no JWT decode needed)
 * 
 * @returns User UUID or null if no session
 */
export async function getUserIdFromSession(): Promise<string | null> {
    try {
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return null
        }

        return user.id
    } catch (error) {
        console.error('[JWT] Error getting user ID:', error)
        return null
    }
}
