const cacheMap = new Map<string, any>();

/**
 * Mocks a Redis Semantic Cache for V2 diagnostics.
 * Caches Gemini outputs using the query string so repeated 
 * identical queries within a short time bypass Gemini API completely.
 */
export async function checkSemanticCache(machineId: string, query: string): Promise<any | null> {
    const key = `semantic_cache:${machineId}:${query.toLowerCase().trim()}`;
    if (cacheMap.has(key)) {
        console.log('[CACHE HIT]', key);
        return cacheMap.get(key);
    }
    return null;
}

export async function setSemanticCache(machineId: string, query: string, data: any): Promise<void> {
    const key = `semantic_cache:${machineId}:${query.toLowerCase().trim()}`;
    cacheMap.set(key, data);

    // Auto clear after 1 hour (Memory protect)
    setTimeout(() => {
        cacheMap.delete(key);
    }, 1000 * 60 * 60);
}
