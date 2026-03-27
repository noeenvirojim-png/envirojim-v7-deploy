import { NextRequest, NextResponse } from 'next/server'
import { diagnosMachine } from '@/domain/machines/actions/diagnostic'

export async function POST(req: NextRequest) {
  try {
    const { machine_slug, problem } = await req.json()

    if (!machine_slug || !problem) {
      return NextResponse.json(
        { error: 'Missing machine_slug or problem' },
        { status: 400 }
      )
    }

    const result = await diagnosMachine(machine_slug, problem)

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    )
  }
}
