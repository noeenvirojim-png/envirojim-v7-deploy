'use server';

import { sendEmail } from '@/lib/services/email';

export async function sendClientOnboardingEmail(email: string, name: string, onboardingLink: string) {
    const subject = `Bienvenue chez EnviroJim - Complétez votre profil`;
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg">
            <h1 style="color: #1e293b; font-size: 24px; font-weight: 800; margin-bottom: 20px;">BIENVENUE CHEZ ENVIROJIM</h1>
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Bonjour ${name},<br><br>
                Votre compte EnviroJim V8 a été préparé. Pour activer votre accès et lier votre compte sécurisé (Google ou Microsoft), veuillez cliquer sur le bouton ci-dessous :
            </p>
            <div style="margin: 30px 0; text-align: center;">
                <a href="${onboardingLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 18px; display: inline-block;">ACTIVER MON COMPTE</a>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                Ce lien expirera dans 24 heures. Pour votre sécurité, ne partagez pas ce lien.
            </p>
        </div>
    `;
    
    return await sendEmail(email, subject, html);
}

export async function pushClientNotification(row: any) {
    // Stub for push notifications / dashboard alerts
    console.log("Push client notification triggered for:", row.client, "Status:", row.livraison);
}
