export type CategoryKind = 'expense' | 'income' | 'debt' | 'saving' | 'transfer';

export interface Category {
  id: string;
  name: string;
  group: string;
  kind: CategoryKind;
  /** Not used lately – hidden from pickers and the budget table. */
  archived?: boolean;
}

export type Source = 'manual' | 'excel' | 'bank' | 'credit' | 'whatsapp' | 'pdf';

export interface Transaction {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** Always positive. Direction comes from `direction`. */
  amount: number;
  direction: 'in' | 'out';
  description: string;
  categoryId: string | null;
  source: Source;
  /** Import batch id, so a whole import can be undone. */
  batch?: string;
  note?: string;
}

export interface Rule {
  /** Normalised keyword matched against the description. */
  keyword: string;
  categoryId: string;
}

export interface ImportBatch {
  id: string;
  label: string;
  source: Source;
  createdAt: string;
  count: number;
}

export interface Holding {
  id: string;
  name: string;
  /** Positive for assets, negative for liabilities. */
  value: number;
}

export interface AppData {
  version: 1;
  categories: Category[];
  transactions: Transaction[];
  /** categoryId -> planned monthly amount */
  budget: Record<string, number>;
  rules: Rule[];
  batches: ImportBatch[];
  courseDone: string[];
  familyName: string;
  holdings: Holding[];
  holdingsDate: string;
  /** true while the sample family is loaded */
  isDemo?: boolean;
}
