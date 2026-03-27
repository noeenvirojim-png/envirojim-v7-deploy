import { MarginCalculationSchema } from './validators';
import { PartRequestItem } from '@/types/schema';
import { z } from 'zod';

type CalculationParams = z.infer<typeof MarginCalculationSchema>;

interface CalculatedItem {
    base_cost_cad: number;
    final_price_cad: number;
    fee_share: number;
}

interface CalculationResult {
    items: CalculatedItem[];
    total_base_cost: number;
    total_sell_price: number;
    total_landed_cost: number;
    effective_margin: number;
}

/**
 * EnviroJim "Pro" Margin Calculator
 * Logic: (Price * (Rate + 0.5)) / (1 - Margin%)
 * + Proportional Fee Distribution
 */
export function calculateQuotePricing(
    items: Array<{ price: number; quantity: number }>,
    params: CalculationParams
): CalculationResult {
    const { exchange_rate_override, target_margin, transport_fees_total } = params;

    // 1. Determine Rate (Mock logic for external API fallback)
    const rate = exchange_rate_override || 1.35; // Default USD->CAD
    const bufferedRate = rate + 0.005; // +0.5 cents buffer as requested (0.005 dollars) OR should it be +0.50? 
    // User said: "convert it to CAD with a +0,5$ added to the current rate" -> usually implies +0.50 spread if rate is ~1.35? 
    // OR +0.005? "0,5$" usually means 50 cents. If rate is 1.35, +0.50 = 1.85. That's a huge buffer.
    // "0,5$ added to the current rate" -> Likely means a spread of 50 cents. I will implement +0.50.

    const effectiveRate = rate + 0.50;

    const marginFactor = 1 - (target_margin / 100); // e.g. 0.65 for 35% margin

    let total_base_cost = 0;
    let total_sell_price = 0;

    // 2. Base Calculations per item
    const tempItems = items.map(item => {
        // Cost in CAD with buffered rate
        const base_cost_unit = item.price * effectiveRate;
        const base_cost_total = base_cost_unit * item.quantity;

        // Sell Price (Margin logic)
        // "35% calculated /0.65" -> Price / 0.65
        const sell_price_unit = base_cost_unit / marginFactor;
        const sell_price_total = sell_price_unit * item.quantity;

        total_base_cost += base_cost_total;
        total_sell_price += sell_price_total;

        return {
            ...item,
            base_cost_unit,
            base_cost_total,
            sell_price_unit,
            sell_price_total
        };
    });

    // 3. Proportional Fee Distribution
    // Fees are distributed based on the "Sell Price" weight of the item
    const landedResults = tempItems.map(item => {
        const weight = total_sell_price > 0 ? (item.sell_price_total / total_sell_price) : 0;
        const fee_share = transport_fees_total * weight;

        return {
            ...item,
            base_cost_cad: Number(item.base_cost_unit.toFixed(2)),
            final_price_cad: Number(item.sell_price_unit.toFixed(2)),
            fee_share: Number(fee_share.toFixed(2)), // For internal tracking only
            quantity: item.quantity,
            part_name: 'Calculated Item', // Placeholder
            id: crypto.randomUUID(),
            margin_percent: target_margin
        };
    });

    const total_landed_cost = total_base_cost + transport_fees_total;
    const effective_margin = total_sell_price > 0
        ? ((total_sell_price - total_landed_cost) / total_sell_price) * 100
        : 0;

    return {
        items: landedResults,
        total_base_cost: Number(total_base_cost.toFixed(2)),
        total_sell_price: Number(total_sell_price.toFixed(2)),
        total_landed_cost: Number(total_landed_cost.toFixed(2)),
        effective_margin: Number(effective_margin.toFixed(2))
    };
}
