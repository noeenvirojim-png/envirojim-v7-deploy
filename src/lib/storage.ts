import { createAdminClient } from '@/lib/supabase/admin';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { ErrorCodes } from '@/lib/errors';
import { logInfo, logError } from '@/lib/logger';

/**
 * Storage Service Abstraction
 * Production implementation using Supabase Storage.
 * This works on Vercel where local disk is read-only.
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg'
];

// File magic number signatures
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46]; // %PDF
const PNG_SIGNATURE = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]; // PNG header
const JPEG_SIGNATURE = [0xFF, 0xD8, 0xFF]; // JPEG/JPG header

/**
 * Validate file before upload
 */
async function validateFile(file: File): Promise<void> {
    // 1. Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error(`${ErrorCodes.INVALID_FILE_TYPE}: Only PDF and image files (PNG, JPG) are allowed`);
    }

    // 2. Check file size
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`${ErrorCodes.FILE_TOO_LARGE}: Maximum file size is 50MB`);
    }

    // 3. Validate magic number (file signature)
    // OPTIMIZATION: Only read the first 8 bytes for signature check, not the whole file
    const HEADER_SIZE = 8;
    const headerBlob = file.slice(0, HEADER_SIZE);
    const buffer = await headerBlob.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    let isValid = false;

    // Check PDF signature
    if (file.type === 'application/pdf') {
        isValid = bytes[0] === PDF_SIGNATURE[0] &&
            bytes[1] === PDF_SIGNATURE[1] &&
            bytes[2] === PDF_SIGNATURE[2] &&
            bytes[3] === PDF_SIGNATURE[3];
    }
    // Check PNG signature
    else if (file.type === 'image/png') {
        isValid = PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
    }
    // Check JPEG signature
    else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        isValid = bytes[0] === JPEG_SIGNATURE[0] &&
            bytes[1] === JPEG_SIGNATURE[1] &&
            bytes[2] === JPEG_SIGNATURE[2];
    }

    if (!isValid) {
        throw new Error(`${ErrorCodes.INVALID_FILE_SIGNATURE}: File signature does not match declared type`);
    }
}

export async function uploadFile(file: File): Promise<string> {
    // 1. Validate file (Universal)
    await validateFile(file);

    // 2. Check for Forced Local Mode (Staff Engineer Requirement)
    if (process.env.NO_NETWORK === 'true') {
        console.log('[Storage] NO_NETWORK active: Redirecting to Local Storage');
        const { uploadFileLocal } = await import('./storage.local');
        return uploadFileLocal(file);
    }

    // Use Admin Client to bypass RLS for uploads (Server Action guarantees permissions)
    const supabase = createAdminClient();

    try {
        // 3. Generate unique path
        const ext = path.extname(file.name);
        const uniqueName = `${randomUUID()}${ext}`;
        const destination = `machine-docs/${uniqueName}`;

        // 4. Upload to 'documents' bucket
        const { data, error } = await supabase.storage
            .from('documents')
            .upload(destination, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            logError('document.upload.failed', error, {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
            });
            
            // Fallback to local if error looks like a network failure
            if (error.message.includes('fetch failed')) {
                console.warn('[Storage] Supabase fetch failed: Falling back to Local Storage');
                const { uploadFileLocal } = await import('./storage.local');
                return uploadFileLocal(file);
            }
            
            throw new Error(`${ErrorCodes.UPLOAD_ERROR}: ${error.message}`);
        }

        // 5. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(destination);

        logInfo('document.uploaded', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            destination,
        });

        return publicUrl;
    } catch (error: any) {
        // Fallback to local on unexpected fetch failure
        if (error.message?.includes('fetch failed')) {
            console.warn('[Storage] Unexpected fetch fail: Falling back to Local Storage');
            const { uploadFileLocal } = await import('./storage.local');
            return uploadFileLocal(file);
        }

        // Re-throw validation errors as-is
        if (error instanceof Error && (
            error.message.includes(ErrorCodes.INVALID_FILE_TYPE) ||
            error.message.includes(ErrorCodes.INVALID_FILE_SIGNATURE) ||
            error.message.includes(ErrorCodes.FILE_TOO_LARGE) ||
            error.message.includes(ErrorCodes.UPLOAD_ERROR)
        )) {
            throw error;
        }

        // Wrap unexpected errors
        console.error('Unexpected upload error:', error);
        throw new Error(`${ErrorCodes.UPLOAD_ERROR}: Failed to upload file`);
    }
}

export async function deleteFile(fileUrl: string): Promise<void> {
    // 1. Check for Local URL
    if (fileUrl.startsWith('file://')) {
        const { deleteFileLocal } = await import('./storage.local');
        return deleteFileLocal(fileUrl);
    }

    // Use Admin Client to bypass RLS for deletions
    const supabase = createAdminClient();

    // Extract path from URL
    // Public URL format: https://[ref].supabase.co/storage/v1/object/public/documents/machine-docs/[uuid].pdf
    const parts = fileUrl.split('/documents/');
    if (parts.length < 2) return;

    const filePath = parts[1];

    const { error } = await supabase.storage
        .from('documents')
        .remove([filePath]);

    if (error) {
        console.error('Supabase Storage Delete Error:', error);
    }
}
