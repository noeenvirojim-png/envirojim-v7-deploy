import { NextRequest, NextResponse } from 'next/server'
import { createProcurementOrder } from '@/domain/machines/actions/procurement'

export async function POST(req: NextRequest) {
  try {
    const { machine_slug, selected_part_ids, quantities, notes } = await req.json()

    if (!machine_slug || !selected_part_ids || !Array.isArray(selected_part_ids)) {
      return NextResponse.json(
        { error: 'Missing machine_slug or selected_part_ids' },
        { status: 400 }
      )
    }

    const result = await createProcurementOrder(machine_slug, {
      selected_part_ids,
      quantities,
      notes,
    })

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    )
  }
}
