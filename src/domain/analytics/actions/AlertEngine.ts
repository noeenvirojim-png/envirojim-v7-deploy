'use server';

import { aggregateKpis, fetchFullOperationalData } from './HistoricalDataFetcher';

export async function checkSystemAnomalies() {
    const kpis = await aggregateKpis();
    const anomalies = [];

    if (kpis.machines_down > 0) {
        anomalies.push({
            type: 'CRITICAL_MAINTENANCE',
            title: 'Arrêt Machine Critique',
            description: `${kpis.machines_down} machine(s) nécessitant une intervention immédiate.`,
            severity: 'CRITICAL'
        });
    }

    if (kpis.transports_delayed > 0) {
        anomalies.push({
            type: 'TRANSPORT_DELAY',
            title: 'Retard Logistique',
            description: `${kpis.transports_delayed} expédition(s) en retard.`,
            severity: 'WARNING'
        });
    }

    if (kpis.parts_in_transit > 5) { // Threshold for example
        anomalies.push({
            type: 'PARTS_OVERLOAD',
            title: 'Volume de Pièces Élevé',
            description: 'Plus de 5 commandes en transit simultané.',
            severity: 'NORMAL'
        });
    }

    return anomalies;
}

export async function generateAnomalyMailto(anomaly: any) {
    const to = 'supervisor@envirojim.com';
    const subject = `[ALERTE SYSTEME] ${anomaly.title}`;
    const body = `CEC EST UNE ALERTE AUTOMATIQUE\n\nType: ${anomaly.type}\nSévérité: ${anomaly.severity}\nDescription: ${anomaly.description}\n\nLien Dashboard: ${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/analytics`;

    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
