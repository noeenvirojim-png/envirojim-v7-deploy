import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MailService } from '@/lib/mail/mailer';

/**
 * Technical Reporter V9
 * Generates automated certification reports for industrial interventions.
 */
export const TechnicalReporter = {
    async generateCertification(interventionId: string) {
        const supabase = createClient();

        // 1. Fetch Intervention Data
        const { data: intervention } = await supabase
            .from('interventions')
            .select(`
                *,
                machine:machines(*),
                organization:organizations(name)
            `)
            .eq('id', interventionId)
            .single();

        if (!intervention) throw new Error('Intervention not found');

        // 2. AI Synthesis
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Tu es l'Ingénieur de Certification EnviroJim.
            Génère un rapport technique formel pour l'intervention suivante :
            Machine: ${intervention.machine.make} ${intervention.machine.model} (S/N: ${intervention.machine.serial_number})
            Technicien: ${intervention.technician_name}
            Type: ${intervention.intervention_type}
            Description: ${intervention.work_description}
            Pièces utilisées: ${intervention.pieces_used}
            Notes: ${intervention.notes}

            Format: Rapport d'Intervention Certifié V9
            Inclus : Résumé exécutif, Diagnostic final, Actions correctives, et Certification de conformité.
            Langue: Français.
        `;

        const result = await model.generateContent(prompt);
        const reportContent = result.response.text();

        // 3. Persist Report Summary (Simulating PDF generation for now by saving as dynamic content)
        await supabase.from('interventions').update({
            notes: `${intervention.notes || ''}\n\n--- CERTIFICATION RAPPORT V9 ---\n${reportContent}`,
            is_completed: true,
            completed_at: new Date().toISOString()
        }).eq('id', interventionId);

        // 4. Notify Supervisor
        await MailService.sendWorkflowNotification({
            to: 'supervisor@envirojim.com', // In real app, fetch from org
            subject: `CERTIFICATION : Intervention ${intervention.machine.serial_number}`,
            template: 'ORDER_CONFIRMED', // Using existing template for now
            data: {
                machine: intervention.machine.serial_number,
                report: reportContent
            }
        });

        return { success: true, report: reportContent };
    }
};
