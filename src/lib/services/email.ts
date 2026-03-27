
// services/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');

export async function sendEmail(to: string, subject: string, html: string) {
    if (!process.env.RESEND_API_KEY) {
        console.log(`[DEV MODE] Email to ${to}: ${subject}`);
        return { id: 'mock-id' };
    }

    try {
        const data = await resend.emails.send({
            from: 'EnviroJim <noreply@envirojim.com>',
            to,
            subject,
            html,
        });
        return data;
    } catch (error) {
        console.error('Email sending failed:', error);
        throw error;
    }
}

export async function sendInvitation(email: string, orgName: string, inviteLink: string) {
    return sendEmail(
        email,
        `Invitation to join ${orgName}`,
        `<p>You have been invited to join <strong>${orgName}</strong> on EnviroJim.</p>
         <p><a href="${inviteLink}">Click here to join</a></p>`
    );
}
