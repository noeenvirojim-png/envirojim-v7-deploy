import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const filePath = searchParams.get('path');

        if (!filePath) {
            return NextResponse.json({ error: 'Missing path' }, { status: 400 });
        }

        const supabase = createClient();

        // Extract bucket and path from the potential full URL or just the path
        // For simplicity in this certification context, we assume the path is relative to the bucket 'machine-manuals'
        const { data, error } = await supabase
            .storage
            .from('machine-manuals')
            .createSignedUrl(filePath, 3600); // 1 hour

        if (error) throw error;

        return NextResponse.json({ url: data.signedUrl });
    } catch (error: any) {
        console.error('Storage signed URL API failed:', error.message);
        return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
    }
}
