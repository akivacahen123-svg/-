import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AppData, Category, ImportBatch, Transaction } from './types';
import { DEFAULT_CATEGORIES } from './defaults';
import { upsertRule } from './categorize';
import { uid } from './format';
import { demoData } from './demo';

const KEY = 'family-budget:v1';

function emptyData(): AppData {
  return {
    version: 1,
    categories: DEFAULT_CATEGORIES,
    transactions: [],
    budget: {},
    rules: [],
    batches: [],
    courseDone: [],
    familyName: '',
    holdings: [],
    holdingsDate: '',
  };
}

export function freshData(): AppData {
  return emptyData();
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return demoData();
    const parsed = JSON.parse(raw) as AppData;
    return { ...emptyData(), ...parsed };
  } catch {
    return demoData();
  }
}

interface Store {
  data: AppData;
  saveError: string | null;
  setData: (fn: (d: AppData) => AppData) => void;
  addTransactions: (txs: Omit<Transaction, 'id'>[], batch?: Omit<ImportBatch, 'id' | 'count' | 'createdAt'>) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>, learn?: boolean) => void;
  deleteTransaction: (id: string) => void;
  undoBatch: (batchId: string) => void;
  categoryById: (id: string | null) => Category | undefined;
  replaceAll: (d: AppData) => void;
  clearDemo: () => void;
  loadDemo: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setState] = useState<AppData>(load);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      setSaveError(null);
    } catch {
      setSaveError('הנתונים לא נשמרו בדפדפן (אולי אין מקום או מצב גלישה פרטית). מומלץ לייצא גיבוי מהגדרות.');
    }
  }, [data]);

  const setData = useCallback((fn: (d: AppData) => AppData) => setState((d) => fn(d)), []);

  const store = useMemo<Store>(() => {
    const catMap = new Map(data.categories.map((c) => [c.id, c]));
    return {
      data,
      saveError,
      setData,
      addTransactions: (txs, batch) =>
        setData((d0) => {
          // the first real entry replaces the sample family
          const d = d0.isDemo ? emptyData() : d0;
          const batchId = batch ? uid() : undefined;
          const withIds = txs.map((t) => ({ ...t, id: uid(), batch: batchId }));
          return {
            ...d,
            transactions: [...d.transactions, ...withIds],
            batches: batch
              ? [...d.batches, { ...batch, id: batchId!, count: withIds.length, createdAt: new Date().toISOString() }]
              : d.batches,
          };
        }),
      updateTransaction: (id, patch, learn) =>
        setData((d) => {
          const tx = d.transactions.find((t) => t.id === id);
          let rules = d.rules;
          if (learn && tx && patch.categoryId) rules = upsertRule(rules, tx.description, patch.categoryId);
          return { ...d, rules, transactions: d.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
        }),
      deleteTransaction: (id) => setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) })),
      undoBatch: (batchId) =>
        setData((d) => ({
          ...d,
          transactions: d.transactions.filter((t) => t.batch !== batchId),
          batches: d.batches.filter((b) => b.id !== batchId),
        })),
      categoryById: (id) => (id ? catMap.get(id) : undefined),
      replaceAll: (d) => setState({ ...emptyData(), ...d }),
      clearDemo: () => setState(emptyData()),
      loadDemo: () => setState(demoData()),
    };
  }, [data, saveError, setData]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
