import { z } from 'zod';

// Re-usable patterns
const uuidSchema = z.string().uuid();
const decimalSchema = z.number().min(0);

// 1. Machine Validator
export const CreateMachineSchema = z.object({
    serial_number: z.string().min(1, "Serial number is required"),
    make: z.string().min(1),
    model: z.string().min(1),
    year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),

    country: z.string().min(2, "Country code required"),
    state_province: z.string().min(2),
    city: z.string().min(1),

    engine_make: z.string().optional(),
    engine_serial: z.string().optional(),

    current_hours: z.number().min(0).default(0),
});

// 2. Parts Request Validator
export const CreatePartRequestSchema = z.object({
    machine_id: uuidSchema,
    urgency: z.enum(['NORMAL', 'HIGH', 'EMERGENCY']).default('NORMAL'),
    items: z.array(z.object({
        part_name: z.string().min(1),
        part_number: z.string().optional(),
        quantity: z.number().int().min(1),
        notes: z.string().optional()
    })).min(1, "At least one item required")
});

// 3. Margin Calculator Validator
export const MarginCalculationSchema = z.object({
    base_price_currency: z.string().length(3), // 'USD'
    base_price_amount: z.number().min(0),
    exchange_rate_override: z.number().min(0.01).optional(),
    target_margin: z.number().min(0).max(100).default(35),
    transport_fees_total: z.number().min(0).default(0)
});
