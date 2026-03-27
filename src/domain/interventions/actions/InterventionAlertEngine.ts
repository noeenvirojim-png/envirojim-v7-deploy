'use server';

export async function sendInterventionAlert(row: any) {
    // Alert logic for technical supervisors
    console.log("Intervention alert triggered for:", row.SN, "Status:", row.statut);
    console.log("Technician Notes:", row.notes);
}
