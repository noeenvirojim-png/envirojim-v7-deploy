import { NextRequest, NextResponse } from 'next/server'
import { getMaintenanceTasks } from '@/domain/machines/actions/maintenance'

export async function POST(req: NextRequest) {
  try {
    const { machine_slug } = await req.json()

    if (!machine_slug) {
      return NextResponse.json(
        { error: 'Missing machine_slug' },
        { status: 400 }
      )
    }

    const result = await getMaintenanceTasks(machine_slug)

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    )
  }
}
