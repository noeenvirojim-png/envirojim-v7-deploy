import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

/**
 * Local Storage Adapter
 * Used for validation when network is isolated.
 * Stores files in /tmp/envirojim-uploads
 */
export async function uploadFileLocal(file: File): Promise<string> {
    const uploadDir = path.join(process.cwd(), 'tmp', 'envirojim-uploads');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name);
    const uniqueName = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, uniqueName);

    // Save physically
    fs.writeFileSync(filePath, buffer);

    // Return a "local" URL structure
    return `file://${filePath}`;
}

export async function deleteFileLocal(fileUrl: string): Promise<void> {
    const filePath = fileUrl.replace('file://', '');
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}
