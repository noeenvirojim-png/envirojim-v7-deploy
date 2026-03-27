export interface DocumentChunk {
    text: string;
    page_number?: number;
    section_title?: string;
}

/**
 * Splits extracted text into semantic chunks with overlap.
 * Optimal for technical manuals: ~600-800 tokens.
 */
export function semanticChunk(
    text: string,
    chunkSizeWords: number = 600,
    overlapWords: number = 100,
    pageNumber?: number
): DocumentChunk[] {
    // Split by paragraphs but preserve Markdown tables as atomic units
    const blocks: string[] = [];
    const chunks: DocumentChunk[] = [];
    const tableRegex = /\|(.+)\|/g;
    
    let lastIndex = 0;
    let match;
    while ((match = tableRegex.exec(text)) !== null) {
        // If there's text before the table, add it as blocks
        const beforeTable = text.substring(lastIndex, match.index).trim();
        if (beforeTable) blocks.push(...beforeTable.split(/\n\s*\n/));
        
        // Find the full table (it ends when a line doesn't start with |)
        const tableStart = match.index;
        let tableEnd = text.indexOf('\n', tableStart);
        while (tableEnd !== -1 && text.substring(tableEnd + 1).trim().startsWith('|')) {
            tableEnd = text.indexOf('\n', tableEnd + 1);
        }
        if (tableEnd === -1) tableEnd = text.length;
        
        blocks.push(text.substring(tableStart, tableEnd).trim());
        lastIndex = tableEnd;
        tableRegex.lastIndex = lastIndex; // Skip the rest of this table
    }
    // Add remaining text
    const remaining = text.substring(lastIndex).trim();
    if (remaining) blocks.push(...remaining.split(/\n\s*\n/));

    let currentChunkWords: string[] = [];

    for (const b of blocks) {
        const words = b.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) continue;

        // If the block itself is larger than chunkSize, we must push current and then push this block
        if (words.length > chunkSizeWords) {
            if (currentChunkWords.length > 0) chunks.push({ text: currentChunkWords.join(' '), page_number: pageNumber });
            chunks.push({ text: b, page_number: pageNumber }); // Atomic block (table or large para)
            currentChunkWords = [];
            continue;
        }

        if (currentChunkWords.length + words.length > chunkSizeWords) {
            chunks.push({ text: currentChunkWords.join(' '), page_number: pageNumber });
            const keepCount = Math.min(overlapWords, currentChunkWords.length);
            currentChunkWords = currentChunkWords.slice(currentChunkWords.length - keepCount);
        }
        currentChunkWords.push(...words);
    }

    if (currentChunkWords.length > 0) {
        chunks.push({ text: currentChunkWords.join(' '), page_number: pageNumber });
    }

    return chunks;
}
