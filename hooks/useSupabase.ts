
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
        // Prepare query
        let query = supabase.from(tableName).select('*');

        // Optimisation: For large tables like test_results or logs, sort by timestamp desc to get recent data first
        // within the range limit.
        if (tableName === 'test_results' || tableName === 'logs' || tableName === 'received_goods' || tableName === 'finished_goods') {
          // We assume these tables have a 'timestamp' column based on schema
          query = query.order('timestamp', { ascending: false });
        }

        // Increased range limit to prevent data loss on large tables (default is 1000)
        // We use 50,000 to cover typical plant operations.
        const { data: dbData, error } = await query.range(0, 50000);

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

    const CHUNK_SIZE = 100; // Safe batch size for Supabase

    const chunkArray = (arr: any[], size: number) => {
      return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
      );
    };

    try {
      if (toDeleteIds.length > 0) {
        const chunks = chunkArray(toDeleteIds, CHUNK_SIZE);
        for (const chunk of chunks) {
          const { error } = await supabase.from(tableName).delete().in(idKey, chunk);
          if (error) {
            console.error(`Error deleting chunk in ${tableName}:`, error);
            // Don't throw immediately, try to process other operations
          }
        }
      }
      if (toUpsert.length > 0) {
        const chunks = chunkArray(toUpsert, CHUNK_SIZE);
        for (const chunk of chunks) {
          const { error } = await supabase.from(tableName).upsert(chunk);
          if (error) {
            console.error(`Error upserting chunk in ${tableName}:`, error);
          }
        }
      }
    } catch (error: any) {
      console.error(`Supabase sync error for ${tableName}:`, error.message || error);
    }
  };

  const setSupabaseData = useCallback((action: React.SetStateAction<T[]>) => {
    setData(prev => {
      const newData = typeof action === 'function' ? (action as any)(prev) : action;
      return newData;
    });
    // FIX #3: Defer sync to after state update, using the ref as the known DB baseline
    // This prevents race conditions when multiple rapid setState calls happen
    Promise.resolve().then(() => {
      setData(current => {
        const baseline = lastSyncedData.current;
        if (current !== baseline) {
          syncToSupabase(current, baseline);
          lastSyncedData.current = current;
        }
        return current; // No state change, just reading current value
      });
    });
  }, [tableName, idKey]);

  return [data, setSupabaseData];
}
