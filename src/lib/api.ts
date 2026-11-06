/**
 * API client for the CJV Luxury Inventory app.
 *
 * When VITE_API_URL is set, talks to the FastAPI backend.
 * When not set, uses a localStorage-backed mock with the same seed data
 * so the UI is fully functional in preview mode.
 */

// ---- Types ----
export type Product = {
  id: string;
  sku: string;
  name: string;
  category: 'Bags' | 'Watches';
  brand: string;
  quantity: number;
  price: number;
  status: 'In stock' | 'Low stock' | 'Out of stock';
  last_verified_at: string | null;
  image_tone: string;
  created_at: string;
};

export type Movement = {
  id: string;
  product_id: string;
  movement_type: 'Stock in' | 'Stock out';
  quantity: number;
  note: string | null;
  created_at: string;
};

export type Scan = {
  id: string;
  name: string;
  location: string;
  expected_count: number;
  detected_count: number;
  discrepancy: number;
  status: 'Matched' | 'Review' | 'Pending';
  created_at: string;
};

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  items_count: number;
  total: number;
  status: 'Processing' | 'Ready' | 'Completed' | 'Cancelled';
  created_at: string;
};

export type Rating = {
  id: string;
  product_id: string | null;
  customer_name: string;
  rating: number;
  review: string;
  created_at: string;
};

export type Recommendation = {
  product_id: string;
  name: string;
  brand: string;
  category: string;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
  suggested_quantity: number;
};

export type TrendingProduct = {
  product_id: string;
  name: string;
  brand: string;
  category: string;
  trend_score: number;
  units_moved: number;
  direction: 'rising' | 'stable' | 'declining';
};

export type ForecastPoint = {
  label: string;
  predicted_demand: number;
  confidence: number;
};

export type DemandForecast = {
  product_id: string;
  name: string;
  current_stock: number;
  forecast: ForecastPoint[];
  reorder_needed: boolean;
  weeks_until_stockout: number | null;
};

export type WeeklyReport = {
  week_label: string;
  total_stock_in: number;
  total_stock_out: number;
  net_change: number;
  inventory_value: number;
  low_stock_count: number;
  open_discrepancies: number;
  top_moving: TrendingProduct[];
  forecast_summary: DemandForecast[];
};

export type DetectionResult = {
  detected_count: number;
  expected_count: number;
  discrepancy: number;
  status: 'Matched' | 'Review' | 'Pending';
  recognized: { product_id: string; name: string; brand: string; detected: number }[];
};

export type AuthSession = {
  access_token: string;
  username: string;
  role: string;
};

// ---- API URL ----
const API_URL = import.meta.env.VITE_API_URL as string | undefined;
export const hasApi = Boolean(API_URL);

// ---- Helpers ----
function status(qty: number): Product['status'] {
  if (qty === 0) return 'Out of stock';
  if (qty <= 3) return 'Low stock';
  return 'In stock';
}

function uuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

// ---- Local mock store ----
type DB = {
  products: Product[];
  movements: Movement[];
  scans: Scan[];
  orders: Order[];
  ratings: Rating[];
};

const STORAGE_KEY = 'cjv-inventory-api-v1';
const SESSION_KEY = 'cjv-inventory-session';

const SEED_PRODUCTS: Omit<Product, 'id' | 'status' | 'last_verified_at' | 'created_at'>[] = [
  { sku: 'CJVB-001', name: 'Classic Flap Medium', category: 'Bags', brand: 'Chanel', quantity: 12, price: 8800, image_tone: 'coral' },
  { sku: 'CJVB-002', name: 'Birkin 25 Togo', category: 'Bags', brand: 'Hermès', quantity: 4, price: 14500, image_tone: 'camel' },
  { sku: 'CJVB-003', name: 'GG Marmont Small', category: 'Bags', brand: 'Gucci', quantity: 8, price: 2300, image_tone: 'olive' },
  { sku: 'CJVB-004', name: 'Lady Dior Small', category: 'Bags', brand: 'Dior', quantity: 3, price: 5200, image_tone: 'camel' },
  { sku: 'CJVB-005', name: 'Neverfull MM', category: 'Bags', brand: 'Louis Vuitton', quantity: 15, price: 2100, image_tone: 'olive' },
  { sku: 'CJVB-006', name: 'Galleria Saffiano', category: 'Bags', brand: 'Prada', quantity: 0, price: 3200, image_tone: 'black' },
  { sku: 'CJWV-001', name: 'Datejust 36', category: 'Watches', brand: 'Rolex', quantity: 6, price: 10800, image_tone: 'gold' },
  { sku: 'CJWV-002', name: 'Santos Medium', category: 'Watches', brand: 'Cartier', quantity: 2, price: 7400, image_tone: 'steel' },
  { sku: 'CJWV-003', name: 'Royal Oak 37mm', category: 'Watches', brand: 'Audemars Piguet', quantity: 0, price: 19600, image_tone: 'steel' },
  { sku: 'CJWV-004', name: 'Tank Solo', category: 'Watches', brand: 'Cartier', quantity: 9, price: 3800, image_tone: 'gold' },
];

const BASE_DATE = new Date(2026, 10, 1, 9, 30);
function daysAgo(d: number, h = 10): string {
  return new Date(BASE_DATE.getTime() - d * 86400000).setHours(h) && new Date(BASE_DATE.getTime() - d * 86400000).toISOString();
}

function initDB(): DB {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    try { return JSON.parse(existing) as DB; } catch { /* fall through */ }
  }
  const now = new Date().toISOString();
  const products: Product[] = SEED_PRODUCTS.map((p) => ({
    ...p, id: uuid(), status: status(p.quantity), last_verified_at: now, created_at: now,
  }));

  const pids = products.map((p) => p.id);
  const movements: Movement[] = [
    { id: uuid(), product_id: pids[0], movement_type: 'Stock in', quantity: 5, note: 'New delivery from Chanel', created_at: daysAgo(1, 9) },
    { id: uuid(), product_id: pids[1], movement_type: 'Stock out', quantity: 2, note: 'VIP client sale', created_at: daysAgo(2, 14) },
    { id: uuid(), product_id: pids[4], movement_type: 'Stock in', quantity: 10, note: 'Restock', created_at: daysAgo(3, 11) },
    { id: uuid(), product_id: pids[6], movement_type: 'Stock out', quantity: 3, note: 'Boutique order', created_at: daysAgo(4, 16) },
    { id: uuid(), product_id: pids[2], movement_type: 'Stock in', quantity: 4, note: 'Seasonal delivery', created_at: daysAgo(6, 10) },
    { id: uuid(), product_id: pids[7], movement_type: 'Stock out', quantity: 1, note: 'Showroom display', created_at: daysAgo(8, 13) },
    { id: uuid(), product_id: pids[3], movement_type: 'Stock in', quantity: 3, note: 'New collection', created_at: daysAgo(10, 9) },
    { id: uuid(), product_id: pids[1], movement_type: 'Stock in', quantity: 6, note: 'Hermès allocation', created_at: daysAgo(12, 12) },
    { id: uuid(), product_id: pids[5], movement_type: 'Stock out', quantity: 5, note: 'Online orders fulfilled', created_at: daysAgo(14, 15) },
    { id: uuid(), product_id: pids[0], movement_type: 'Stock out', quantity: 4, note: 'Holiday sales', created_at: daysAgo(16, 11) },
    { id: uuid(), product_id: pids[9], movement_type: 'Stock out', quantity: 2, note: 'Anniversary gift', created_at: daysAgo(18, 14) },
    { id: uuid(), product_id: pids[4], movement_type: 'Stock out', quantity: 3, note: 'Client pickup', created_at: daysAgo(20, 10) },
  ];

  const scans: Scan[] = [
    { id: uuid(), name: 'Showroom shelf check', location: 'Main showroom', expected_count: 52, detected_count: 51, discrepancy: -1, status: 'Review', created_at: daysAgo(1, 16) },
    { id: uuid(), name: 'Vitrine audit', location: 'Front vitrine', expected_count: 52, detected_count: 52, discrepancy: 0, status: 'Matched', created_at: daysAgo(5, 11) },
    { id: uuid(), name: 'Backroom scan', location: 'Storage room A', expected_count: 52, detected_count: 50, discrepancy: -2, status: 'Review', created_at: daysAgo(9, 9) },
  ];

  const orders: Order[] = [
    { id: uuid(), order_number: 'CJV-0001', customer_name: 'Amelia Hart', items_count: 1, total: 8800, status: 'Completed', created_at: daysAgo(2, 14) },
    { id: uuid(), order_number: 'CJV-0002', customer_name: 'Marcus Lee', items_count: 2, total: 16800, status: 'Ready', created_at: daysAgo(4, 11) },
    { id: uuid(), order_number: 'CJV-0003', customer_name: 'Sofia Reyes', items_count: 1, total: 14500, status: 'Processing', created_at: daysAgo(5, 16) },
    { id: uuid(), order_number: 'CJV-0004', customer_name: 'James Chen', items_count: 1, total: 2300, status: 'Completed', created_at: daysAgo(7, 10) },
    { id: uuid(), order_number: 'CJV-0005', customer_name: 'Iris Wang', items_count: 3, total: 14900, status: 'Processing', created_at: daysAgo(9, 13) },
    { id: uuid(), order_number: 'CJV-0006', customer_name: 'David Kim', items_count: 1, total: 10800, status: 'Ready', created_at: daysAgo(11, 15) },
  ];

  const ratings: Rating[] = [
    { id: uuid(), product_id: null, customer_name: 'Amelia Hart', rating: 5, review: 'Exceptional service and a beautiful showroom experience.', created_at: daysAgo(2, 15) },
    { id: uuid(), product_id: null, customer_name: 'Marcus Lee', rating: 4, review: 'Great selection, would love more watch brands.', created_at: daysAgo(4, 12) },
    { id: uuid(), product_id: null, customer_name: 'Sofia Reyes', rating: 5, review: 'The Birkin arrived in perfect condition. Highly recommend.', created_at: daysAgo(6, 10) },
  ];

  const db: DB = { products, movements, scans, orders, ratings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  return db;
}

function saveDB(db: DB) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

// ---- Analytics (client-side mock) ----
function mockRecommendations(db: DB): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const p of db.products) {
    const recentOut = db.movements.filter((m) => m.product_id === p.id && m.movement_type === 'Stock out').reduce((s, m) => s + m.quantity, 0);
    const isLow = p.quantity <= 3;
    let urgency: Recommendation['urgency'] = 'low';
    let reason = '';
    let suggested = 0;

    if (p.quantity === 0) { urgency = 'high'; reason = 'Out of stock — replenish immediately to avoid lost sales.'; suggested = Math.max(5, recentOut + 3); }
    else if (isLow && recentOut >= 2) { urgency = 'high'; reason = `Low stock with ${recentOut} units recently sold — high churn risk.`; suggested = Math.max(5, recentOut + 2); }
    else if (isLow) { urgency = 'medium'; reason = 'Stock is below the safe threshold (3 units).'; suggested = 5; }
    else if (recentOut >= 4) { urgency = 'medium'; reason = `Strong demand: ${recentOut} units moved recently. Consider restocking.`; suggested = recentOut; }
    else continue;

    recs.push({ product_id: p.id, name: p.name, brand: p.brand, category: p.category, reason, urgency, suggested_quantity: suggested });
  }
  recs.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.urgency] - { high: 0, medium: 1, low: 2 }[b.urgency]));
  return recs;
}

function mockTrending(db: DB): TrendingProduct[] {
  const trending: TrendingProduct[] = [];
  for (const p of db.products) {
    const movs = db.movements.filter((m) => m.product_id === p.id);
    if (!movs.length) continue;
    const total = movs.reduce((s, m) => s + m.quantity, 0);
    const sorted = [...movs].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const mid = Math.floor(sorted.length / 2);
    const prior = mid > 0 ? sorted.slice(0, mid).reduce((s, m) => s + m.quantity, 0) : total;
    const recent = mid > 0 ? sorted.slice(mid).reduce((s, m) => s + m.quantity, 0) : 0;
    const direction: TrendingProduct['direction'] = recent > prior ? 'rising' : recent < prior ? 'declining' : 'stable';
    const score = total * (direction === 'rising' ? 1.5 : direction === 'stable' ? 1.0 : 0.7);
    trending.push({ product_id: p.id, name: p.name, brand: p.brand, category: p.category, trend_score: Math.round(score * 10) / 10, units_moved: total, direction });
  }
  trending.sort((a, b) => b.trend_score - a.trend_score);
  return trending;
}

function mockForecast(db: DB, weeks: number): DemandForecast[] {
  const forecasts: DemandForecast[] = [];
  for (const p of db.products) {
    const outMovs = db.movements.filter((m) => m.product_id === p.id && m.movement_type === 'Stock out');
    const avgWeekly = outMovs.length ? outMovs.reduce((s, m) => s + m.quantity, 0) / 3.0 : 1.0;
    let cumulative = 0;
    const points: ForecastPoint[] = [];
    for (let w = 1; w <= weeks; w++) {
      const predicted = Math.max(0, Math.round(avgWeekly));
      cumulative += predicted;
      const confidence = Math.max(0.5, 0.92 - w * 0.08);
      points.push({ label: `Week ${w}`, predicted_demand: predicted, confidence: Math.round(confidence * 100) / 100 });
    }
    const reorderNeeded = p.quantity <= cumulative;
    const weeksUntilStockout = avgWeekly > 0 ? (p.quantity > 0 ? Math.max(1, Math.floor(p.quantity / avgWeekly)) : 0) : null;
    forecasts.push({ product_id: p.id, name: p.name, current_stock: p.quantity, forecast: points, reorder_needed: reorderNeeded, weeks_until_stockout: weeksUntilStockout });
  }
  forecasts.sort((a, b) => (a.weeks_until_stockout ?? 999) - (b.weeks_until_stockout ?? 999));
  return forecasts;
}

function mockWeeklyReport(db: DB): WeeklyReport {
  const totalIn = db.movements.filter((m) => m.movement_type === 'Stock in').reduce((s, m) => s + m.quantity, 0);
  const totalOut = db.movements.filter((m) => m.movement_type === 'Stock out').reduce((s, m) => s + m.quantity, 0);
  const inventoryValue = db.products.reduce((s, p) => s + p.quantity * p.price, 0);
  const lowStock = db.products.filter((p) => p.status === 'Low stock').length;
  const openDisc = db.scans.filter((s) => s.status === 'Review').length;
  const topMoving = mockTrending(db).slice(0, 3);
  const forecastSummary = mockForecast(db, 2).filter((f) => f.reorder_needed).slice(0, 5);
  return {
    week_label: 'Week of Nov 1, 2026',
    total_stock_in: totalIn, total_stock_out: totalOut, net_change: totalIn - totalOut,
    inventory_value: inventoryValue, low_stock_count: lowStock, open_discrepancies: openDisc,
    top_moving: topMoving, forecast_summary: forecastSummary,
  };
}

function mockDetection(db: DB): DetectionResult {
  const expected = db.products.reduce((s, p) => s + p.quantity, 0);
  const variances = [0, -1, -2, 1];
  const weights = [55, 25, 12, 8];
  let r = Math.random() * 100;
  let variance = 0;
  for (let i = 0; i < variances.length; i++) { r -= weights[i]; if (r <= 0) { variance = variances[i]; break; } }
  const detected = Math.max(0, expected + variance);
  const discrepancy = detected - expected;
  const resultStatus: DetectionResult['status'] = discrepancy === 0 ? 'Matched' : 'Review';
  const recognized: DetectionResult['recognized'] = [];
  let remaining = detected;
  for (const p of db.products) {
    if (remaining <= 0) break;
    const count = Math.min(remaining, Math.max(1, p.quantity));
    recognized.push({ product_id: p.id, name: p.name, brand: p.brand, detected: count });
    remaining -= count;
  }
  return { detected_count: detected, expected_count: expected, discrepancy, status: resultStatus, recognized };
}

// ---- API fetch helper ----
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

function authHeaders(): Record<string, string> {
  const session = localStorage.getItem(SESSION_KEY);
  if (!session) return {};
  try {
    const parsed = JSON.parse(session) as AuthSession;
    return { Authorization: `Bearer ${parsed.access_token}` };
  } catch {
    return {};
  }
}

// ---- Public API ----
export const api = {
  // Auth
  async login(username: string, password: string): Promise<AuthSession> {
    if (hasApi) {
      const session = await apiFetch<AuthSession & { token_type: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      const clean: AuthSession = { access_token: session.access_token, username: session.username, role: session.role };
      localStorage.setItem(SESSION_KEY, JSON.stringify(clean));
      return clean;
    }
    // mock auth
    await new Promise((r) => setTimeout(r, 600));
    const validUsers: Record<string, string> = { admin: 'admin123', jordan: 'cjv2026' };
    if (!validUsers[username] || validUsers[username] !== password) {
      throw new Error('Username or password is incorrect.');
    }
    const session: AuthSession = { access_token: `mock-${uuid()}`, username, role: 'manager' };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
  },

  getSession(): AuthSession | null {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as AuthSession; } catch { return null; }
  },

  // Products
  async getProducts(): Promise<Product[]> {
    if (hasApi) return apiFetch<Product[]>('/api/products');
    const db = initDB();
    return db.products;
  },

  async addProduct(data: Omit<Product, 'id' | 'status' | 'last_verified_at' | 'created_at'>): Promise<Product> {
    if (hasApi) {
      return apiFetch<Product>('/api/products', { method: 'POST', body: JSON.stringify(data), headers: authHeaders() });
    }
    const db = initDB();
    const product: Product = { ...data, id: uuid(), status: status(data.quantity), last_verified_at: new Date().toISOString(), created_at: new Date().toISOString() };
    db.products.push(product);
    saveDB(db);
    return product;
  },

  // Movements
  async getMovements(): Promise<Movement[]> {
    if (hasApi) return apiFetch<Movement[]>('/api/movements');
    const db = initDB();
    return [...db.movements].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async addMovement(data: Omit<Movement, 'id' | 'created_at'>): Promise<Movement> {
    if (hasApi) {
      return apiFetch<Movement>('/api/movements', { method: 'POST', body: JSON.stringify(data), headers: authHeaders() });
    }
    const db = initDB();
    const product = db.products.find((p) => p.id === data.product_id);
    if (!product) throw new Error('Product not found');
    if (data.movement_type === 'Stock out' && data.quantity > product.quantity) throw new Error('Insufficient stock');
    const nextQty = data.movement_type === 'Stock in' ? product.quantity + data.quantity : product.quantity - data.quantity;
    product.quantity = nextQty;
    product.status = status(nextQty);
    product.last_verified_at = new Date().toISOString();
    const movement: Movement = { ...data, id: uuid(), created_at: new Date().toISOString() };
    db.movements.push(movement);
    saveDB(db);
    return movement;
  },

  // Scans
  async getScans(): Promise<Scan[]> {
    if (hasApi) return apiFetch<Scan[]>('/api/scans');
    const db = initDB();
    return [...db.scans].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  // Camera detection
  async runDetection(): Promise<DetectionResult> {
    if (hasApi) {
      return apiFetch<DetectionResult>('/api/detection/scan', { method: 'POST', headers: authHeaders() });
    }
    const db = initDB();
    const result = mockDetection(db);
    const scan: Scan = { id: uuid(), name: 'Camera detection scan', location: 'Live camera', expected_count: result.expected_count, detected_count: result.detected_count, discrepancy: result.discrepancy, status: result.status, created_at: new Date().toISOString() };
    db.scans.push(scan);
    saveDB(db);
    return result;
  },

  // Orders
  async getOrders(): Promise<Order[]> {
    if (hasApi) return apiFetch<Order[]>('/api/orders');
    const db = initDB();
    return [...db.orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async addOrder(data: Omit<Order, 'id' | 'created_at'>): Promise<Order> {
    if (hasApi) {
      return apiFetch<Order>('/api/orders', { method: 'POST', body: JSON.stringify(data), headers: authHeaders() });
    }
    const db = initDB();
    const order: Order = { ...data, id: uuid(), created_at: new Date().toISOString() };
    db.orders.push(order);
    saveDB(db);
    return order;
  },

  // Ratings
  async getRatings(): Promise<Rating[]> {
    if (hasApi) return apiFetch<Rating[]>('/api/ratings');
    const db = initDB();
    return [...db.ratings].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async addRating(data: Omit<Rating, 'id' | 'created_at'>): Promise<Rating> {
    if (hasApi) {
      return apiFetch<Rating>('/api/ratings', { method: 'POST', body: JSON.stringify(data), headers: authHeaders() });
    }
    const db = initDB();
    const rating: Rating = { ...data, id: uuid(), created_at: new Date().toISOString() };
    db.ratings.push(rating);
    saveDB(db);
    return rating;
  },

  // Analytics
  async getRecommendations(): Promise<Recommendation[]> {
    if (hasApi) return apiFetch<Recommendation[]>('/api/analytics/recommendations');
    return mockRecommendations(initDB());
  },

  async getTrending(): Promise<TrendingProduct[]> {
    if (hasApi) return apiFetch<TrendingProduct[]>('/api/analytics/trending');
    return mockTrending(initDB());
  },

  async getForecast(weeks = 4): Promise<DemandForecast[]> {
    if (hasApi) return apiFetch<DemandForecast[]>(`/api/analytics/forecast?weeks=${weeks}`);
    return mockForecast(initDB(), weeks);
  },

  async getWeeklyReport(): Promise<WeeklyReport> {
    if (hasApi) return apiFetch<WeeklyReport>('/api/analytics/weekly-report');
    return mockWeeklyReport(initDB());
  },
};
