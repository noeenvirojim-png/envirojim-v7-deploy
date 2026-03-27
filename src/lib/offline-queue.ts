import { processOfflineQueueStatus } from '@/domain/assets/actions/sync';

export interface QueueItem {
    id: string;
    type: 'INSPECTION' | 'PHOTO' | 'TICKET' | 'DIAGNOSTIC' | 'PART_REQUEST';
    payload: any;
    status: 'PENDING' | 'SYNCING' | 'FAILED' | 'COMPLETED';
    createdAt: number;
    retryCount: number;
    lastAttempt?: number;
    payloadHash?: string;
}

const DB_NAME = 'EnviroJim_OfflineDB';
const STORE_NAME = 'sync_queue';
const MAX_RETRIES = 5;

let isProcessing = false;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') return reject('Not in browser');
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e: any) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function generateId() {
    return Math.random().toString(36).substring(2, 15);
}

function hashPayload(type: string, payload: any): string {
    const str = `${type}:${JSON.stringify(payload)}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

export const offlineQueue = {
    async enqueue(type: QueueItem['type'], payload: any): Promise<void> {
        const payloadHash = hashPayload(type, payload);
        
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            
            // Deduplication check
            const existingItems = await new Promise<QueueItem[]>((resolve) => {
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
            });

            if (existingItems.some(i => i.payloadHash === payloadHash && i.status !== 'COMPLETED')) {
                console.log(`[OFFLINE QUEUE] Duplicate detected for ${type}, skipping.`);
                return;
            }

            const item: QueueItem = {
                id: generateId(),
                type,
                payload,
                status: 'PENDING',
                createdAt: Date.now(),
                retryCount: 0,
                payloadHash
            };

            store.put(item);
            console.log(`[OFFLINE QUEUE] Enqueued: ${type}`);
        } catch (e) {
            console.error('[OFFLINE QUEUE] enqueue error', e);
        }
    },

    async getPendingItems(): Promise<QueueItem[]> {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const items = request.result as QueueItem[];
                    resolve(items.filter(i => {
                        if (i.status === 'COMPLETED') return false;
                        if (i.retryCount >= MAX_RETRIES) return false;
                        
                        // Exponential backoff check
                        if (i.status === 'FAILED' && i.lastAttempt) {
                            const delay = Math.pow(2, i.retryCount) * 2000;
                            return (Date.now() - i.lastAttempt) > delay;
                        }
                        
                        return true;
                    }));
                };
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            return [];
        }
    },

    async updateItemResult(id: string, success: boolean, error?: string): Promise<void> {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => {
                const item = request.result as QueueItem;
                if (item) {
                    if (success) {
                        store.delete(id); // Successful items are purged
                    } else {
                        item.status = 'FAILED';
                        item.retryCount += 1;
                        item.lastAttempt = Date.now();
                        if (item.retryCount >= MAX_RETRIES) {
                            console.error(`[OFFLINE QUEUE] Max retries reached for ${item.id}`);
                        }
                        store.put(item);
                    }
                }
            };
        } catch (e) {
            console.error('[OFFLINE QUEUE] result update error', e);
        }
    },

    async processQueue(): Promise<void> {
        if (typeof window === 'undefined' || !navigator.onLine || isProcessing) return;

        isProcessing = true;
        console.log('[OFFLINE QUEUE] Starting sync cycle...');

        try {
            const pendingItems = await this.getPendingItems();
            if (pendingItems.length === 0) {
                isProcessing = false;
                return;
            }

            const { results } = await processOfflineQueueStatus(pendingItems);

            for (const res of results) {
                await this.updateItemResult(res.id, res.status === 'COMPLETED', res.error);
            }
        } catch (e) {
            console.error('[OFFLINE QUEUE] Sync crash', e);
        } finally {
            isProcessing = false;
            console.log('[OFFLINE QUEUE] Sync cycle finished.');
        }
    },

    subscribeToOnlineEvents(): void {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.processQueue());
            // Periodic check every 30s if online
            setInterval(() => this.processQueue(), 30000);
        }
    }
};
