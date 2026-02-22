import { openDB, DBSchema } from 'idb';
import { QRState } from '../store/qrStore';

export interface QRStudioDB extends DBSchema
{
    drafts: {
        key: string;
        value: {
            id: string;
            state: Partial<QRState>;
            updatedAt: number;
        };
        indexes: { 'by-updated': number };
    };
}

const DB_NAME = 'qr-studio-db';
const STORE_NAME = 'drafts';
const DRAFT_ID = 'current-draft'; // Simple approach: one draft for now

let dbPromise: ReturnType<typeof openDB<QRStudioDB>> | null = null;

if (typeof window !== 'undefined')
{
    dbPromise = openDB<QRStudioDB>(DB_NAME, 1, {
        upgrade(db)
        {
            const store = db.createObjectStore(STORE_NAME, {
                keyPath: 'id',
            });
            store.createIndex('by-updated', 'updatedAt');
        },
    });
}

export async function saveDraft(state: Partial<QRState>)
{
    if (!dbPromise) return;
    const db = await dbPromise;
    await db.put(STORE_NAME, {
        id: DRAFT_ID,
        state,
        updatedAt: Date.now(),
    });
}

export async function loadDraft()
{
    if (!dbPromise) return null;
    const db = await dbPromise;
    const draft = await db.get(STORE_NAME, DRAFT_ID);
    return draft ? draft.state : null;
}
