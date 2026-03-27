import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const TIMEOUT_MS = 30000;

export async function POST(req: NextRequest) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const proto = req.headers.get('x-forwarded-proto');
        if (process.env.NODE_ENV === 'production' && proto !== 'https') {
            return NextResponse.json({ error: 'Secure context required' }, { status: 403 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API not configured' }, { status: 503 });
        }

        const contentType = req.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
            return NextResponse.json({ error: 'Invalid Content-Type' }, { status: 415 });
        }

        const formData = await req.formData();
        const audioFile = formData.get('audio') as File | null;

        if (!audioFile) {
            return NextResponse.json({ error: 'Missing audio file' }, { status: 400 });
        }

        if (audioFile.size > MAX_SIZE) {
            return NextResponse.json({ error: 'Audio file exceeds 10MB limit' }, { status: 413 });
        }

        if (!audioFile.type.startsWith('audio/')) {
            return NextResponse.json({ error: 'Invalid file type. Expected audio/*' }, { status: 415 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

        const arrayBuffer = await audioFile.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString('base64');

        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            inlineData: {
                                data: base64Audio,
                                mimeType: audioFile.type,
                            },
                        },
                        {
                            text: 'Transcribe accurately. Return only the transcription text.',
                        },
                    ],
                },
            ],
        }, { signal: controller.signal });

        const response = await result.response;
        const text = response.text();
        const cleanText = text?.trim() || '';

        if (cleanText === '') {
            return NextResponse.json({ error: 'Empty transcription' }, { status: 500 });
        }

        return NextResponse.json({ text: cleanText });

    } catch (error: any) {
        if (error.name === 'AbortError') {
            return NextResponse.json({ error: 'Transcription timeout' }, { status: 504 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    } finally {
        clearTimeout(timeout);
    }
}
