import { PartRequest } from '@/types/schema';

/**
 * Notification Service
 * Handles the "Automated Emails" requirement for the Parts Workflow.
 * 
 * Triggers:
 * - Boss receives "Approval Needed"
 * - EnviroJim receives "New Quote Request"
 * - Client receives "Tracking Number"
 * - Accounting receives "Ready to Invoice"
 */

export async function sendEmail(to: string, template: string, data: any) {
    // In production, connect to SendGrid / Resend / AWS SES
    console.log(`[MOCK EMAIL] To: ${to} | Template: ${template}`, data);
    return true;
}

export async function notifyBossForApproval(request: PartRequest) {
    return sendEmail(
        'boss@client-org.com',
        'APPROVAL_REQUIRED',
        { requestId: request.id, total: '$500' }
    );
}

export async function notifyAccounting(request: PartRequest) {
    return sendEmail(
        'accounting@envirojim.com',
        'READY_TO_INVOICE',
        { quoteId: 'PENDING' }
    );
}
