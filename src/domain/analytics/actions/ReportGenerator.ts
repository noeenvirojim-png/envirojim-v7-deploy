'use server';

import { fetchFullOperationalData } from './HistoricalDataFetcher';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generateCsvReport() {
    const data = await fetchFullOperationalData();
    
    // CSV Header
    let csv = "Category,ID,Machine_SN,Status,Date\n";
    
    // Append Maintenance
    data.maintenance.forEach(m => {
        csv += `Maintenance,${m.id},${m.machine?.serial_number},${m.alert_level},${m.created_at}\n`;
    });
    
    // Append Parts
    data.parts.forEach(p => {
        csv += `Parts,${p.id},${p.machine?.serial_number},${p.internal_status},${p.created_at}\n`;
    });
    
    // Append Transports
    data.transports.forEach(t => {
        csv += `Transport,${t.id},${t.machine?.serial_number},${t.status},${t.created_at}\n`;
    });
    
    return {
        filename: `envirojim_operational_report_${new Date().toISOString().split('T')[0]}.csv`,
        content: csv
    };
}

export async function generateExecutiveSummary() {
    const data = await fetchFullOperationalData();
    
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
        Tu es le Senior Operational Analyst chez EnviroJim.
        Données : ${JSON.stringify({
            maintenance_count: data.maintenance.length,
            parts_count: data.parts.length,
            transport_count: data.transports.length
        })}
        
        Tache : 
        Rédige un résumé exécutif de 3 paragraphes sur l'état du parc machine et des opérations logistiques.
        Sois précis, professionnel et souligne les points d'attention.
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (e: any) {
        return "Échec de génération du résumé. Veuillez consulter les données CSV.";
    }
}
