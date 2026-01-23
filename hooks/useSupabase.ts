
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useSupabase<T>(
  tableName: string,
  initialValue: T[],
  idKey: string = 'id'
): [T[], React.Dispatch<React.SetStateAction<T[]>>] {
  const [data, setData] = useState<T[]>(initialValue);
  // Track the data that is currently known to be in the DB (or scheduled to be)
  const lastSyncedData = useRef<T[]>(initialValue);
  // Ref to track if sync is allowed. We disable it if the table doesn't exist or network fails.
  const syncEnabled = useRef<boolean>(true);

  // Fetch initial data
  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: dbData, error } = await supabase.from(tableName).select('*');
        
        if (error) {
          // Check for specific Supabase errors that indicate configuration issues
          if (error.code === 'PGRST205' || error.code === '42P01') {
              console.warn(`Supabase table '${tableName}' not found. Disabling sync. Using local data.`);
              syncEnabled.current = false;
          } else {
              throw error;
          }
        } else if (dbData) {
          setData(dbData as unknown as T[]);
          lastSyncedData.current = dbData as unknown as T[];
        }
      } catch (error: any) {
        // Network errors (Failed to fetch) or other API errors
        console.warn(`[Offline Mode] Could not sync '${tableName}' with Supabase. Using local data. Error: ${error.message || 'Network request failed'}`);
        syncEnabled.current = false;
      }
    };
    fetch();
  }, [tableName]);

  const syncToSupabase = async (newData: T[], oldData: T[]) => {
    if (!syncEnabled.current) return;

    const oldMap = new Map(oldData.map((item: any) => [String(item[idKey]), item]));
    const newIds = new Set(newData.map((item: any) => String(item[idKey])));

    // Find items to insert or update
    const toUpsert = newData.filter((item: any) => {
        const id = String(item[idKey]);
        const oldItem = oldMap.get(id);
        // Upsert if it's new OR if it has changed
        return !oldItem || JSON.stringify(item) !== JSON.stringify(oldItem);
    });

    // Find items to delete
    const toDeleteIds = oldData
        .filter((item: any) => !newIds.has(String(item[idKey])))
        .map((item: any) => String(item[idKey]));

    try {
        if (toDeleteIds.length > 0) {
            const { error } = await supabase.from(tableName).delete().in(idKey, toDeleteIds);
            if (error) throw error;
        }
        if (toUpsert.length > 0) {
            const { error } = await supabase.from(tableName).upsert(toUpsert);
            if (error) throw error;
        }
    } catch (error: any) {
         console.error(`Supabase sync error for ${tableName}:`, error.message || error);
         // If a write fails, we might want to disable future syncs to prevent loop, 
         // or just log it. For now, we log it.
    }
  };

  const setSupabaseData = useCallback((action: React.SetStateAction<T[]>) => {
    setData(prev => {
        const newData = typeof action === 'function' ? (action as any)(prev) : action;
        // Trigger sync with the previous confirmed state
        syncToSupabase(newData, prev); 
        lastSyncedData.current = newData;
        return newData;
    });
  }, [tableName, idKey]);

  return [data, setSupabaseData];
}
