import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api, { type FuelEntry, type Vehicle } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { normalizeEntries, type Entry } from '@/lib/stats';

export type EntryInput = Omit<FuelEntry, 'id' | 'vehicleName'>;

export class DuplicateEntryError extends Error {
  constructor() {
    super('duplicate');
  }
}

interface DataContextType {
  /** All entries, normalised, ascending by time. */
  entries: Entry[];
  vehicles: Vehicle[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  loaded: boolean;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  addEntry: (data: EntryInput, force?: boolean) => Promise<void>;
  updateEntry: (id: string, data: Partial<FuelEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  getRaw: (id: string) => FuelEntry | undefined;
  reloadVehicles: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

/**
 * Single source of truth for the user's fill-ups. The data set is personal
 * (tens to a few thousand rows), so we load it once and compute every chart
 * and stat on the client — instant filter changes, no extra endpoints.
 */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [raw, setRaw] = useState<FuelEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!isAuthenticated) return;
      if (inflight.current) return inflight.current;
      const run = (async () => {
        if (!opts?.silent) setRefreshing(true);
        try {
          const [es, vs] = await Promise.all([
            api.getEntries({ limit: 5000, sortBy: 'date', order: 'DESC' }),
            api.getVehicles(),
          ]);
          setRaw(es);
          setVehicles(vs);
          setError(null);
          setLoaded(true);
        } catch (e: any) {
          setError(e?.message ?? 'load failed');
        } finally {
          setRefreshing(false);
          setLoading(false);
          inflight.current = null;
        }
      })();
      inflight.current = run;
      return run;
    },
    [isAuthenticated],
  );

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      refresh({ silent: true });
    } else {
      setRaw([]);
      setVehicles([]);
      setLoaded(false);
    }
    // user id change = different account
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  const entries = useMemo(() => normalizeEntries(raw), [raw]);

  const addEntry = useCallback(
    async (data: EntryInput, force = false) => {
      try {
        await api.addEntry(data, force);
      } catch (e: any) {
        if (String(e?.message ?? '').includes('409')) throw new DuplicateEntryError();
        throw e;
      }
      await refresh({ silent: true });
    },
    [refresh],
  );

  const updateEntry = useCallback(
    async (id: string, data: Partial<FuelEntry>) => {
      await api.updateEntry(id, data);
      await refresh({ silent: true });
    },
    [refresh],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      // Optimistic: drop it locally first so the list animates out immediately.
      setRaw((r) => r.filter((e) => e.id !== id));
      try {
        await api.deleteEntry(id);
      } finally {
        await refresh({ silent: true });
      }
    },
    [refresh],
  );

  const reloadVehicles = useCallback(async () => {
    try {
      setVehicles(await api.getVehicles());
    } catch {}
  }, []);

  const getRaw = useCallback((id: string) => raw.find((e) => e.id === id), [raw]);

  const value = useMemo(
    () => ({
      entries,
      vehicles,
      loading,
      refreshing,
      error,
      loaded,
      refresh,
      addEntry,
      updateEntry,
      deleteEntry,
      getRaw,
      reloadVehicles,
    }),
    [entries, vehicles, loading, refreshing, error, loaded, refresh, addEntry, updateEntry, deleteEntry, getRaw, reloadVehicles],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
