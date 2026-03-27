'use server';

export async function sendMailToTransporteur(row: any) {
    const transporteurEmail = `${row.transporter_name?.replace(/\s+/g, '').toLowerCase()}@example.com`;
    const mailto = `mailto:${transporteurEmail}?subject=Logistique EnviroJim - ${row.id}&body=SN: ${row.machine?.serial_number || 'Stock'}\nPiece: ${row.piece || 'Multiple'}\nDate Envoi: ${row.pickup_date_act || 'TBD'}`;
    console.log("Generated transport mailto:", mailto);
    return mailto;
}

export async function pushNotification(row: any) {
    console.log("Push notification sent for transport:", row.id, "Status:", row.status);
}
