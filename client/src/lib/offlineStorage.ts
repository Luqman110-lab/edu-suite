import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineDBSchema extends DBSchema {
  students: {
    key: number;
    value: {
      id: number;
      data: any;
      syncedAt: number;
    };
    indexes: { 'by-synced': number };
  };
  pendingSync: {
    key: string;
    value: {
      id: string;
      type: 'create' | 'update' | 'delete';
      entity: string;
      data: any;
      createdAt: number;
      retries: number;
    };
    indexes: { 'by-entity': string };
  };
  cachedData: {
    key: string;
    value: {
      key: string;
      data: any;
      timestamp: number;
      expiresAt: number;
    };
  };
  settings: {
    key: string;
    value: any;
  };
}

let db: IDBPDatabase<OfflineDBSchema> | null = null;

const DB_NAME = 'edusuite-offline';
const DB_VERSION = 1;

export async function initOfflineDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (db) return db;
  
  db = await openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('students')) {
        const studentStore = database.createObjectStore('students', { keyPath: 'id' });
        studentStore.createIndex('by-synced', 'syncedAt');
      }
      
      if (!database.objectStoreNames.contains('pendingSync')) {
        const syncStore = database.createObjectStore('pendingSync', { keyPath: 'id' });
        syncStore.createIndex('by-entity', 'entity');
      }
      
      if (!database.objectStoreNames.contains('cachedData')) {
        database.createObjectStore('cachedData', { keyPath: 'key' });
      }
      
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings');
      }
    },
  });
  
  return db;
}

export async function cacheData(key: string, data: any, ttlMinutes: number = 30): Promise<void> {
  const database = await initOfflineDB();
  const now = Date.now();
  
  await database.put('cachedData', {
    key,
    data,
    timestamp: now,
    expiresAt: now + (ttlMinutes * 60 * 1000),
  });
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  const database = await initOfflineDB();
  const cached = await database.get('cachedData', key);
  
  if (!cached) return null;
  
  if (Date.now() > cached.expiresAt) {
    await database.delete('cachedData', key);
    return null;
  }
  
  return cached.data as T;
}

export async function addPendingSync(
  entity: string,
  type: 'create' | 'update' | 'delete',
  data: any
): Promise<string> {
  const database = await initOfflineDB();
  const id = `${entity}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  await database.put('pendingSync', {
    id,
    type,
    entity,
    data,
    createdAt: Date.now(),
    retries: 0,
  });
  
  return id;
}

export async function getPendingSync(): Promise<Array<{
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  createdAt: number;
  retries: number;
}>> {
  const database = await initOfflineDB();
  return database.getAll('pendingSync');
}

export async function removePendingSync(id: string): Promise<void> {
  const database = await initOfflineDB();
  await database.delete('pendingSync', id);
}

export async function updatePendingSyncRetry(id: string): Promise<void> {
  const database = await initOfflineDB();
  const item = await database.get('pendingSync', id);
  if (item) {
    item.retries += 1;
    await database.put('pendingSync', item);
  }
}

export async function clearExpiredCache(): Promise<void> {
  const database = await initOfflineDB();
  const all = await database.getAll('cachedData');
  const now = Date.now();
  
  for (const item of all) {
    if (now > item.expiresAt) {
      await database.delete('cachedData', item.key);
    }
  }
}

export async function getPendingSyncCount(): Promise<number> {
  const database = await initOfflineDB();
  return database.count('pendingSync');
}

export async function setSetting(key: string, value: any): Promise<void> {
  const database = await initOfflineDB();
  await database.put('settings', value, key);
}

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const database = await initOfflineDB();
  return database.get('settings', key);
}

export function isOnline(): boolean {
  return navigator.onLine;
}

let syncInProgress = false;

export async function syncPendingData(): Promise<{ success: number; failed: number }> {
  if (syncInProgress || !isOnline()) {
    return { success: 0, failed: 0 };
  }
  
  syncInProgress = true;
  let success = 0;
  let failed = 0;
  
  try {
    const pending = await getPendingSync();
    
    for (const item of pending) {
      if (item.retries >= 3) {
        continue;
      }
      
      try {
        let endpoint = `/api/${item.entity}`;
        let method = 'POST';
        
        if (item.type === 'update') {
          endpoint = `/api/${item.entity}/${item.data.id}`;
          method = 'PUT';
        } else if (item.type === 'delete') {
          endpoint = `/api/${item.entity}/${item.data.id}`;
          method = 'DELETE';
        }
        
        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: item.type !== 'delete' ? JSON.stringify(item.data) : undefined,
          credentials: 'include',
        });
        
        if (response.ok) {
          await removePendingSync(item.id);
          success++;
        } else {
          await updatePendingSyncRetry(item.id);
          failed++;
        }
      } catch (error) {
        await updatePendingSyncRetry(item.id);
        failed++;
      }
    }
  } finally {
    syncInProgress = false;
  }
  
  return { success, failed };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncPendingData();
  });
}
