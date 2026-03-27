import { NextResponse } from 'next/server';
import { uploadFile } from '@/lib/storage';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
        }

        const publicUrl = await uploadFile(file);

        return NextResponse.json({ success: true, data: { publicUrl } });
    } catch (error: any) {
        console.error('[API UPLOAD] POST failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Upload failed'
        }, { status: 500 });
    }
}
