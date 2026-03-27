'use server';

/**
 * TransportAIMapper
 * Logic to transform fuzzy descriptions in transport logs into standardized data.
 */
export async function transportAIMapper(row: any) {
    const description = (row.piece || row.description_fuzzy || '').toLowerCase();
    
    // Simple logic as per stub, but could be extended with Gemini
    if (description.includes("bolt convoyeur")) {
        return {
            ...row,
            piece: "Conveyor Bolt EJ-STD",
            category: "HARDWARE"
        };
    }
    
    return row;
}
