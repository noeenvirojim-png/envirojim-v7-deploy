'use server';

import { TechnicalReporter } from '@/lib/reporting/TechnicalReporter';
import { revalidatePath } from 'next/cache';

export async function generateInterventionReport(interventionId: string, machineId: string) {
    try {
        const result = await TechnicalReporter.generateCertification(interventionId);
        revalidatePath(`/dashboard/machines/${machineId}`);
        return { success: true, report: result.report };
    } catch (error: any) {
        console.error('[REPORTING_ACTION] Failed to generate report:', error);
        return { success: false, error: error.message };
    }
}
