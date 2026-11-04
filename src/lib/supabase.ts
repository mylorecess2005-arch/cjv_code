import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const rememberLoginKey = 'cjv-remember-login';

const authStorage = {
  async getItem(key: string) {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (localStorage.getItem(rememberLoginKey) === 'true') {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, value);
    localStorage.removeItem(key);
  },
  async removeItem(key: string) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

/**
 * When Supabase credentials are present, use the real cloud database.
 * When they are absent, use a small localStorage-backed adapter so the UI
 * still opens and can be tested without setting up Supabase first.
 */
function createLocalPreviewClient() {
  type Row = Record<string, any>;
  const storageKey = 'cjv-inventory-preview-v1';
  const readStore = (): Record<string, Row[]> => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch {
      return {};
    }
  };
  const writeStore = (store: Record<string, Row[]>) => {
    localStorage.setItem(storageKey, JSON.stringify(store));
  };

  return {
    from(table: string) {
      let operation: 'select' | 'insert' | 'update' = 'select';
      let payload: Row | Row[] = {};
      let filters: Array<[string, unknown]> = [];
      let sort: { column: string; ascending: boolean } | null = null;
      let maxRows: number | null = null;

      const builder: any = {
        select() {
          if (operation === 'select') operation = 'select';
          return builder;
        },
        order(column: string, options?: { ascending?: boolean }) {
          sort = { column, ascending: options?.ascending ?? true };
          return builder;
        },
        limit(count: number) {
          maxRows = count;
          return builder;
        },
        insert(rows: Row | Row[]) {
          operation = 'insert';
          payload = rows;
          return builder;
        },
        update(values: Row) {
          operation = 'update';
          payload = values;
          return builder;
        },
        eq(column: string, value: unknown) {
          filters.push([column, value]);
          return builder;
        },
        async maybeSingle() {
          const result = await execute();
          return { data: Array.isArray(result.data) ? result.data[0] ?? null : result.data, error: result.error };
        },
        then(resolve: (value: any) => unknown, reject?: (reason: unknown) => unknown) {
          return execute().then(resolve, reject);
        },
      };

      async function execute() {
        const store = readStore();
        const rows = store[table] ?? [];
        let result: Row[] = rows;

        if (operation === 'insert') {
          const incoming = (Array.isArray(payload) ? payload : [payload]).map((row) => ({
            id: row.id ?? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`),
            created_at: row.created_at ?? new Date().toISOString(),
            ...row,
          }));
          result = incoming;
          store[table] = [...rows, ...incoming];
          writeStore(store);
        } else if (operation === 'update') {
          const updated = rows.map((row) => filters.every(([key, value]) => row[key] === value) ? { ...row, ...(payload as Row) } : row);
          store[table] = updated;
          result = updated.filter((row) => filters.every(([key, value]) => row[key] === value));
          writeStore(store);
        } else {
          result = [...rows];
        }

        if (sort) {
          const { column, ascending } = sort;
          result.sort((a, b) => {
            const left = a[column] ?? '';
            const right = b[column] ?? '';
            const comparison = left < right ? -1 : left > right ? 1 : 0;
            return ascending ? comparison : -comparison;
          });
        }
        if (maxRows !== null) result = result.slice(0, maxRows);
        return { data: result, error: null };
      }

      return builder;
    },
  };
}

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
export const isLocalPreview = !hasSupabaseConfig;
export const supabase: any = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabaseAnonKey!, { auth: { storage: authStorage } })
  : createLocalPreviewClient();
