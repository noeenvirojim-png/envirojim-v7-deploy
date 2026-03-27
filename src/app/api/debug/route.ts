import { cookies } from 'next/headers'

export async function GET() {
    const cookieStore = cookies()
    return Response.json({
        cookies: cookieStore.getAll()
    })
}
