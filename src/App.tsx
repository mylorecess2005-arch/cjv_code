import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowDownToLine,
  ArrowUpRight,
  Bell,
  Camera,
  Check,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  Download,
  FileBarChart,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Menu,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Users,
  Sparkles,
  Tags,
  TrendingUp,
  Lightbulb,
  LineChart,
  X,
} from 'lucide-react';
import LoginPage from '@/LoginPage';
import {
  api,
  hasApi,
  type Product,
  type Movement,
  type Scan,
  type Order,
  type Rating,
  type Recommendation,
  type TrendingProduct,
  type DemandForecast,
  type WeeklyReport,
} from '@/lib/api';

type View =
  | 'Overview'
  | 'Products'
  | 'Categories'
  | 'Inventory'
  | 'Orders'
  | 'Rating'
  | 'Camera scan'
  | 'Stock movements'
  | 'Must-buy'
  | 'Trending'
  | 'Forecast'
  | 'Reports';

const navItems: { label: View; icon: typeof LayoutDashboard }[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Products', icon: ShoppingBag },
  { label: 'Categories', icon: Tags },
  { label: 'Inventory', icon: Package },
  { label: 'Orders', icon: ClipboardCheck },
  { label: 'Rating', icon: Star },
  { label: 'Camera scan', icon: Camera },
  { label: 'Stock movements', icon: ArrowUpRight },
  { label: 'Must-buy', icon: Lightbulb },
  { label: 'Trending', icon: TrendingUp },
  { label: 'Forecast', icon: LineChart },
  { label: 'Reports', icon: FileBarChart },
];

const analyticsItems = ['Must-buy', 'Trending', 'Forecast', 'Reports'] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function App() {
  const [loginStatus, setLoginStatus] = useState<'checking' | 'unauthenticated' | 'authenticated'>('checking');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('cjv-remember-login') === 'true');
  const [view, setView] = useState<View>('Overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [trending, setTrending] = useState<TrendingProduct[]>([]);
  const [forecast, setForecast] = useState<DemandForecast[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [query, setQuery] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState<'All' | 'Bags' | 'Watches'>('All');
  const [showAdd, setShowAdd] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Restore session on mount
  useEffect(() => {
    const session = api.getSession();
    setLoginStatus(session ? 'authenticated' : 'unauthenticated');
  }, []);

  // Load all workspace data + analytics when authenticated
  useEffect(() => {
    if (loginStatus !== 'authenticated') return;

    async function loadAll() {
      setLoading(true);
      try {
        const [p, m, s, o, r, rec, tr, fc, wr] = await Promise.all([
          api.getProducts(),
          api.getMovements(),
          api.getScans(),
          api.getOrders(),
          api.getRatings(),
          api.getRecommendations(),
          api.getTrending(),
          api.getForecast(4),
          api.getWeeklyReport(),
        ]);
        setProducts(p);
        setMovements(m);
        setScans(s);
        setOrders(o);
        setRatings(r);
        setRecommendations(rec);
        setTrending(tr);
        setForecast(fc);
        setWeeklyReport(wr);
      } catch {
        setNotice('Could not load workspace data. Please try again.');
      }
      setLoading(false);
    }
    void loadAll();
  }, [loginStatus]);

  const clearWorkspaceData = useCallback(() => {
    setProducts([]);
    setMovements([]);
    setScans([]);
    setOrders([]);
    setRatings([]);
    setRecommendations([]);
    setTrending([]);
    setForecast([]);
    setWeeklyReport(null);
    setLoading(false);
  }, []);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesQuery = `${product.name} ${product.brand} ${product.sku}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = inventoryCategory === 'All' || product.category === inventoryCategory;
    return matchesQuery && matchesCategory;
  }), [products, query, inventoryCategory]);

  const totalUnits = products.reduce((sum, product) => sum + product.quantity, 0);
  const totalValue = products.reduce((sum, product) => sum + product.quantity * product.price, 0);
  const lowStock = products.filter((product) => product.status === 'Low stock').length;
  const discrepancies = scans.filter((scan) => scan.status === 'Review').length;

  async function handleAddProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const quantity = Number(form.get('quantity')) || 0;
    const price = Number(form.get('price')) || 0;
    const category = String(form.get('category')) as 'Bags' | 'Watches';
    const product = await api.addProduct({
      sku: String(form.get('sku')),
      name: String(form.get('name')),
      category,
      brand: String(form.get('brand')),
      quantity,
      price,
      image_tone: category === 'Watches' ? 'steel' : 'camel',
    });
    setProducts((current) => [...current, product]);
    setShowAdd(false);
    setNotice('Product registered successfully.');
    // refresh analytics
    void refreshAnalytics();
  }

  async function handleAddOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const orderData = {
      order_number: `CJV-${String(orders.length + 1).padStart(4, '0')}`,
      customer_name: String(form.get('customer_name')),
      items_count: Number(form.get('items_count')) || 1,
      total: Number(form.get('total')) || 0,
      status: String(form.get('status')) as Order['status'],
    };
    const order = await api.addOrder(orderData);
    setOrders((current) => [order, ...current]);
    setNotice(`${orderData.order_number} added to orders.`);
  }

  async function handleAddRating(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ratingData = {
      product_id: String(form.get('product_id')) || null,
      customer_name: String(form.get('customer_name')),
      rating: Number(form.get('rating')) || 5,
      review: String(form.get('review')),
    };
    const rating = await api.addRating(ratingData);
    setRatings((current) => [rating, ...current]);
    setNotice('Customer rating added.');
  }

  function downloadCsv(filename: string, rows: (string | number)[][]) {
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportProducts() {
    const rows = products.map((product) => [product.name, product.brand, product.sku, product.category, product.quantity, product.price, product.status]);
    downloadCsv('cjv-inventory.csv', [['Product', 'Brand', 'SKU', 'Category', 'Quantity', 'Unit price', 'Status'], ...rows]);
    setNotice('Inventory export downloaded.');
  }

  function exportReport() {
    const reportRows: (string | number)[][] = [
      ['CJV Luxury Inventory Report', new Date().toISOString()],
      [],
      ['Inventory monitoring'],
      ['Total products', products.length],
      ['Total units', totalUnits],
      ['Inventory value', totalValue],
      ['Low stock items', lowStock],
      ['Open discrepancies', discrepancies],
      [],
      ['Camera discrepancy scans'],
      ['Scan date', 'Location', 'Expected', 'Detected', 'Difference', 'Status'],
      ...scans.map((scan) => [scan.created_at, scan.location, scan.expected_count, scan.detected_count, scan.discrepancy, scan.status]),
      [],
      ['Stock movements'],
      ['Date', 'Product', 'Type', 'Quantity', 'Note'],
      ...movements.map((movement) => [movement.created_at, products.find((product) => product.id === movement.product_id)?.name ?? 'Product', movement.movement_type, movement.quantity, movement.note ?? '']),
      [],
      ['Orders'],
      ['Order', 'Customer', 'Items', 'Total', 'Status'],
      ...orders.map((order) => [order.order_number, order.customer_name, order.items_count, order.total, order.status]),
      [],
      ['Must-buy recommendations'],
      ['Product', 'Brand', 'Urgency', 'Suggested quantity', 'Reason'],
      ...recommendations.map((rec) => [rec.name, rec.brand, rec.urgency, rec.suggested_quantity, rec.reason]),
      [],
      ['Trending products'],
      ['Product', 'Brand', 'Trend score', 'Units moved', 'Direction'],
      ...trending.map((t) => [t.name, t.brand, t.trend_score, t.units_moved, t.direction]),
      [],
      ['Demand forecast (4 weeks)'],
      ['Product', 'Current stock', 'Weeks until stockout', 'Reorder needed'],
      ...forecast.map((f) => [f.name, f.current_stock, f.weeks_until_stockout ?? 'N/A', f.reorder_needed ? 'Yes' : 'No']),
    ];
    downloadCsv('cjv-inventory-report.csv', reportRows);
    setNotice('Full inventory report downloaded.');
  }

  async function refreshAnalytics() {
    try {
      const [rec, tr, fc, wr] = await Promise.all([
        api.getRecommendations(),
        api.getTrending(),
        api.getForecast(4),
        api.getWeeklyReport(),
      ]);
      setRecommendations(rec);
      setTrending(tr);
      setForecast(fc);
      setWeeklyReport(wr);
    } catch { /* ignore */ }
  }

  async function handleRecordMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const productId = String(form.get('product_id'));
    const movementType = String(form.get('movement_type')) as Movement['movement_type'];
    const quantity = Number(form.get('quantity')) || 0;
    const product = products.find((item) => item.id === productId);
    if (!product || quantity < 1 || (movementType === 'Stock out' && quantity > product.quantity)) {
      setNotice('Please choose a valid quantity for the selected product.');
      return;
    }
    const nextQuantity = movementType === 'Stock in' ? product.quantity + quantity : product.quantity - quantity;
    const nextStatus = nextQuantity === 0 ? 'Out of stock' : nextQuantity <= 3 ? 'Low stock' : 'In stock';
    try {
      const movement = await api.addMovement({
        product_id: productId,
        movement_type: movementType,
        quantity,
        note: String(form.get('note') || ''),
      });
      setProducts((current) => current.map((item) => item.id === productId ? { ...item, quantity: nextQuantity, status: nextStatus } : item));
      setMovements((current) => [movement, ...current]);
      setShowMovement(false);
      setNotice(`${movementType} recorded for ${product.name}.`);
      void refreshAnalytics();
    } catch {
      setNotice('Stock movement could not be saved.');
    }
  }

  async function runScan() {
    setIsScanning(true);
    setNotice('Camera is comparing the shelf against your inventory records.');
    try {
      const result = await api.runDetection();
      // Reload scans to get the new one
      const updatedScans = await api.getScans();
      setScans(updatedScans);
      setNotice(`Scan complete. ${result.detected_count} of ${result.expected_count} units detected — ${result.status}.`);
    } catch {
      setNotice('Scan could not be completed.');
    }
    setIsScanning(false);
  }

  async function handleLogin(username: string, password: string) {
    setLoginLoading(true);
    setLoginError('');
    try {
      localStorage.setItem('cjv-remember-login', rememberMe ? 'true' : 'false');
      await api.login(username, password);
      setLoginStatus('authenticated');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'The login service is unavailable.');
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    api.logout();
    clearWorkspaceData();
    setLoginStatus('unauthenticated');
  }

  if (loginStatus === 'checking') {
    return <main className="login-checking" aria-live="polite">Checking your sign-in session…</main>;
  }
  if (loginStatus === 'unauthenticated') {
    return (
      <LoginPage
        error={hasApi ? loginError : 'Demo mode — use admin / admin123 or jordan / cjv2026 to sign in.'}
        isLoading={loginLoading}
        rememberMe={rememberMe}
        onRememberMeChange={setRememberMe}
        onSubmit={handleLogin}
      />
    );
  }

  // Split nav into workspace and analytics sections
  const workspaceNav = navItems.filter((item) => !analyticsItems.includes(item.label as typeof analyticsItems[number]));
  const analyticsNav = navItems.filter((item) => analyticsItems.includes(item.label as typeof analyticsItems[number]));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="brand-lockup"><img className="brand-logo" src="/cjv-logo.png" alt="CJV Luxury Bags & Watches" /></div>
        <div className="workspace-switcher"><div className="workspace-avatar">C</div><div><span>Workspace</span><strong>CJV Showroom</strong></div><ChevronDown size={16} /></div>
        <nav className="main-nav">
          <span className="nav-label">Workspace</span>
          {workspaceNav.map(({ label, icon: Icon }) => (
            <button className={view === label ? 'nav-item active' : 'nav-item'} key={label} onClick={() => { setView(label); setMobileMenuOpen(false); }}>
              <Icon size={18} /><span>{label}</span>{label === 'Camera scan' && <span className="nav-dot" />}
            </button>
          ))}
          <span className="nav-label" style={{ marginTop: '14px' }}>Analytics</span>
          {analyticsNav.map(({ label, icon: Icon }) => (
            <button className={view === label ? 'nav-item active' : 'nav-item'} key={label} onClick={() => { setView(label); setMobileMenuOpen(false); }}>
              <Icon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setView('Categories')}><Tags size={18} /><span>Categories</span></button>
          <button className="nav-item"><Settings size={18} /><span>Settings</span></button>
          <button className="nav-item" onClick={handleLogout}><LogOut size={18} /><span>Log out</span></button>
          <div className="help-card"><Sparkles size={18} /><strong>Smart verification</strong><p>Use the camera to catch stock differences before they become costly.</p><button onClick={() => setView('Camera scan')}>Try a scan <ArrowUpRight size={14} /></button></div>
          <div className="profile"><div className="profile-avatar">JD</div><div><strong>Jordan Davis</strong><span>Inventory manager</span></div><ChevronDown size={15} /></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileMenuOpen((current) => !current)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{view}</strong></div>
          <div className="topbar-actions">
            <div className="search-box"><Search size={16} /><input placeholder="Search inventory" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
            <button className="icon-button" onClick={() => setNotice('You have no new notifications.')} aria-label="Notifications"><Bell size={18} /><span className="notification-dot" /></button>
            <button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={17} /> Register product</button>
          </div>
        </header>
        {notice && <div className="notice"><Check size={15} />{notice}<button onClick={() => setNotice('')}><X size={15} /></button></div>}
        {view === 'Overview' && <Overview products={products} totalUnits={totalUnits} totalValue={totalValue} lowStock={lowStock} discrepancies={discrepancies} movements={movements} scans={scans} recommendations={recommendations} trending={trending} onScan={() => setView('Camera scan')} onInventory={() => setView('Inventory')} loading={loading} />}
        {view === 'Products' && <Products products={filteredProducts} onAdd={() => setShowAdd(true)} />}
        {view === 'Categories' && <Categories products={products} onOpenInventory={() => setView('Inventory')} />}
        {view === 'Inventory' && <Inventory products={filteredProducts} allProducts={products} category={inventoryCategory} onCategoryChange={setInventoryCategory} onAdd={() => setShowAdd(true)} onExport={exportProducts} />}
        {view === 'Orders' && <Orders orders={orders} onSubmit={handleAddOrder} />}
        {view === 'Rating' && <Ratings products={products} ratings={ratings} onSubmit={handleAddRating} />}
        {view === 'Camera scan' && <CameraScan products={products} scans={scans} isScanning={isScanning} onScan={runScan} />}
        {view === 'Stock movements' && <Movements products={products} movements={movements} onAdd={() => setShowMovement(true)} />}
        {view === 'Must-buy' && <MustBuy recommendations={recommendations} products={products} loading={loading} />}
        {view === 'Trending' && <Trending trending={trending} loading={loading} />}
        {view === 'Forecast' && <Forecast forecast={forecast} loading={loading} />}
        {view === 'Reports' && <Reports products={products} scans={scans} totalValue={totalValue} weeklyReport={weeklyReport} recommendations={recommendations} trending={trending} onExport={exportReport} loading={loading} />}
      </main>
      {showAdd && <AddProductModal onClose={() => setShowAdd(false)} onSubmit={handleAddProduct} />}
      {showMovement && <MovementModal products={products} onClose={() => setShowMovement(false)} onSubmit={handleRecordMovement} />}
    </div>
  );
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Overview({ products, totalUnits, totalValue, lowStock, discrepancies, movements, scans, recommendations, trending, onScan, onInventory, loading }: {
  products: Product[]; totalUnits: number; totalValue: number; lowStock: number; discrepancies: number;
  movements: Movement[]; scans: Scan[]; recommendations: Recommendation[]; trending: TrendingProduct[];
  onScan: () => void; onInventory: () => void; loading: boolean;
}) {
  return <div className="content">
    <PageTitle eyebrow="Friday, November 6, 2026" title="Good morning, Jordan" description="Here's what's happening across your showroom today." action={<button className="secondary-button" onClick={onScan}><Camera size={16} /> Start camera scan</button>} />
    <div className="kpi-grid">
      <Kpi label="Total inventory value" value={formatCurrency(totalValue)} change="12.8%" icon={<Archive size={19} />} tone="blue" />
      <Kpi label="Units in stock" value={String(totalUnits).padStart(2, '0')} change="4.2%" icon={<Package size={19} />} tone="sage" />
      <Kpi label="Low stock items" value={String(lowStock).padStart(2, '0')} change="Needs attention" icon={<CircleAlert size={19} />} tone="amber" negative />
      <Kpi label="Open discrepancies" value={String(discrepancies).padStart(2, '0')} change="From latest scans" icon={<ClipboardCheck size={19} />} tone="rose" negative />
    </div>
    <div className="overview-grid">
      <section className="panel chart-panel">
        <div className="panel-heading"><div><h2>Inventory value</h2><p>Estimated value across all categories</p></div><button className="select-button">Last 30 days <ChevronDown size={14} /></button></div>
        <div className="chart-value">{formatCurrency(totalValue)} <span>+8.4%</span></div>
        <div className="chart">
          <div className="chart-y"><span>$160k</span><span>$120k</span><span>$80k</span><span>$40k</span><span>$0</span></div>
          <div className="chart-area">
            <div className="grid-lines" />
            <svg viewBox="0 0 620 190" preserveAspectRatio="none" role="img" aria-label="Inventory value trend">
              <defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6f92a0" stopOpacity=".25" /><stop offset="100%" stopColor="#6f92a0" stopOpacity="0" /></linearGradient></defs>
              <path d="M0,151 C48,145 62,155 98,126 S165,131 201,107 S273,120 305,83 S368,96 401,70 S470,83 506,45 S573,64 620,24 L620,190 L0,190Z" fill="url(#area)" />
              <path d="M0,151 C48,145 62,155 98,126 S165,131 201,107 S273,120 305,83 S368,96 401,70 S470,83 506,45 S573,64 620,24" fill="none" stroke="#628a99" strokeWidth="3" />
            </svg>
            <div className="chart-x"><span>Oct 03</span><span>Oct 10</span><span>Oct 17</span><span>Oct 24</span><span>Oct 31</span></div>
          </div>
        </div>
      </section>
      <section className="panel category-panel">
        <div className="panel-heading"><div><h2>By category</h2><p>Current unit distribution</p></div><button className="more-button">•••</button></div>
        <div className="donut-wrap">
          <div className="donut"><div><strong>{totalUnits}</strong><span>units</span></div></div>
          <div className="legend">
            <Legend color="navy" label="Bags" value={products.filter((p) => p.category === 'Bags').reduce((s, p) => s + p.quantity, 0)} total={totalUnits} />
            <Legend color="gold" label="Watches" value={products.filter((p) => p.category === 'Watches').reduce((s, p) => s + p.quantity, 0)} total={totalUnits} />
          </div>
        </div>
        <button className="text-button" onClick={onInventory}>View all inventory <ArrowUpRight size={15} /></button>
      </section>
    </div>

    {/* Smart insights row */}
    <div className="lower-grid">
      <section className="panel activity-panel">
        <div className="panel-heading"><div><h2>Recent activity</h2><p>Latest changes in your workspace</p></div><button className="text-button">View all <ArrowUpRight size={15} /></button></div>
        {loading ? <div className="empty-state">Loading workspace activity…</div> : movements.length ? movements.slice(0, 4).map((movement) => <Activity key={movement.id} movement={movement} products={products} />) : <div className="empty-state">No movements recorded yet.</div>}
      </section>
      <section className="panel scan-panel">
        <div className="panel-heading"><div><h2>Latest scan</h2><p>Camera verification status</p></div><span className="status-pill success"><span />{scans[0]?.status ?? 'Ready'}</span></div>
        <div className="scan-card"><div className="scan-icon"><Camera size={22} /></div><div><strong>{scans[0] ? `${scans[0].detected_count} of ${scans[0].expected_count} units detected` : 'No scan completed yet'}</strong><span>{scans[0] ? formatTime(scans[0].created_at) : 'Place items in view to verify'}</span></div></div>
        <button className="scan-cta" onClick={onScan}><Camera size={17} /> Run a new scan</button>
      </section>
    </div>

    {/* Analytics preview */}
    <div className="lower-grid" style={{ marginTop: '17px' }}>
      <section className="panel">
        <div className="panel-heading"><div><h2>Must-buy alerts</h2><p>Top replenishment priorities</p></div><Lightbulb size={20} className="heading-icon" /></div>
        {recommendations.length ? recommendations.slice(0, 3).map((rec) => (
          <div className="activity-row" key={rec.product_id}>
            <div className={`activity-icon ${rec.urgency === 'high' ? 'out' : 'in'}`}><Lightbulb size={16} /></div>
            <div><strong>{rec.name}</strong><span>{rec.reason}</span></div>
            <b className={`urgency-badge ${rec.urgency}`}>{rec.urgency}</b>
          </div>
        )) : <div className="empty-state">No urgent restocks needed.</div>}
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Trending now</h2><p>Fastest-moving products</p></div><TrendingUp size={20} className="heading-icon" /></div>
        {trending.length ? trending.slice(0, 3).map((t) => (
          <div className="activity-row" key={t.product_id}>
            <div className={`activity-icon ${t.direction === 'rising' ? 'in' : 'out'}`}><TrendingUp size={16} /></div>
            <div><strong>{t.name}</strong><span>{t.units_moved} units moved · {t.direction}</span></div>
            <b>{t.trend_score}</b>
          </div>
        )) : <div className="empty-state">No trending data yet.</div>}
      </section>
    </div>
  </div>;
}

function Kpi({ label, value, change, icon, tone, negative = false }: { label: string; value: string; change: string; icon: React.ReactNode; tone: string; negative?: boolean }) {
  return <div className="kpi-card"><div className={`kpi-icon ${tone}`}>{icon}</div><div className="kpi-label">{label}</div><strong className="kpi-value">{value}</strong><span className={negative ? 'kpi-change muted' : 'kpi-change'}>{!negative && <ArrowUpRight size={13} />}{change}</span></div>;
}
function Legend({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  return <div className="legend-row"><span className={`legend-dot ${color}`} /><div><strong>{label}</strong><span>{value} units</span></div><b>{total ? Math.round((value / total) * 100) : 0}%</b></div>;
}
function Activity({ movement, products }: { movement: Movement; products: Product[] }) {
  const product = products.find((item) => item.id === movement.product_id);
  return <div className="activity-row"><div className={`activity-icon ${movement.movement_type === 'Stock in' ? 'in' : 'out'}`}>{movement.movement_type === 'Stock in' ? <ArrowDownToLine size={16} /> : <ArrowUpRight size={16} />}</div><div><strong>{movement.movement_type} · {product?.name ?? 'Product'}</strong><span>{movement.note ?? 'Inventory update'} · {formatTime(movement.created_at)}</span></div><b>{movement.movement_type === 'Stock in' ? '+' : '-'}{movement.quantity}</b></div>;
}

function Products({ products, onAdd }: { products: Product[]; onAdd: () => void }) {
  return <div className="content"><PageTitle eyebrow="Product library" title="Products" description="Your full collection of luxury bags and watches, ready to register and manage." action={<button className="primary-button" onClick={onAdd}><Plus size={17} /> Add product</button>} />
    <div className="product-grid">{products.map((product) => <article className="product-card" key={product.id}><div className={`product-card-art ${product.image_tone}`}><ShoppingBag size={32} /><span>{product.category}</span></div><div className="product-card-body"><div><span className="eyebrow">{product.brand}</span><h2>{product.name}</h2></div><span className={`status-pill ${product.status === 'In stock' ? 'success' : product.status === 'Low stock' ? 'warning' : 'danger'}`}><span />{product.status}</span><div className="product-meta"><span>{product.sku}</span><strong>{formatCurrency(product.price)}</strong></div></div></article>)}</div>
    {!products.length && <div className="empty-state">No products match your search.</div>}
  </div>;
}

function Categories({ products, onOpenInventory }: { products: Product[]; onOpenInventory: () => void }) {
  const categories = ['Bags', 'Watches'] as const;
  return <div className="content"><PageTitle eyebrow="Collection structure" title="Categories" description="See how your showroom is balanced across product types." />
    <div className="category-grid">{categories.map((category) => {
      const items = products.filter((product) => product.category === category);
      const units = items.reduce((sum, product) => sum + product.quantity, 0);
      const value = items.reduce((sum, product) => sum + product.quantity * product.price, 0);
      return <button className="category-card" key={category} onClick={onOpenInventory}><div className={`category-art ${category === 'Bags' ? 'navy' : 'gold'}`}><ListFilter size={25} /></div><div><span className="eyebrow">{category}</span><h2>{units} units</h2><p>{items.length} registered products · {formatCurrency(value)}</p></div><ArrowUpRight size={18} /></button>;
    })}</div>
  </div>;
}

function Orders({ orders, onSubmit }: { orders: Order[]; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="content"><PageTitle eyebrow="Client orders" title="Orders" description="Track customer requests from processing to completion." action={<OrderModalButton onSubmit={onSubmit} />} />
    <div className="order-summary">
      <div><Users size={18} /><span>Open orders</span><strong>{orders.filter((order) => order.status !== 'Completed' && order.status !== 'Cancelled').length}</strong></div>
      <div><Package size={18} /><span>Items requested</span><strong>{orders.reduce((sum, order) => sum + order.items_count, 0)}</strong></div>
      <div><Archive size={18} /><span>Order value</span><strong>{formatCurrency(orders.reduce((sum, order) => sum + order.total, 0))}</strong></div>
    </div>
    <section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.order_number}</strong></td><td>{order.customer_name}</td><td>{order.items_count}</td><td>{formatCurrency(order.total)}</td><td><span className={`order-status ${order.status.toLowerCase()}`}>{order.status}</span></td><td className="muted-text">{formatTime(order.created_at)}</td></tr>)}</tbody></table>{!orders.length && <div className="empty-state">No orders have been added yet.</div>}</div></section>
  </div>;
}

function Ratings({ products, ratings, onSubmit }: { products: Product[]; ratings: Rating[]; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="content"><PageTitle eyebrow="Customer feedback" title="Rating" description="Capture product feedback and keep a pulse on the showroom experience." action={<RatingModalButton products={products} onSubmit={onSubmit} />} />
    <div className="rating-hero"><div><span className="eyebrow">Average rating</span><strong>{ratings.length ? (ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length).toFixed(1) : '—'}</strong><div className="stars">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={16} fill="currentColor" />)}</div></div><p>{ratings.length ? `${ratings.length} customer reviews saved in your workspace.` : 'Add the first customer review to start tracking satisfaction.'}</p></div>
    <div className="rating-list">{ratings.map((rating) => <article className="panel rating-card" key={rating.id}><div className="rating-avatar">{rating.customer_name.slice(0, 1).toUpperCase()}</div><div><div className="rating-card-top"><strong>{rating.customer_name}</strong><span>{formatTime(rating.created_at)}</span></div><div className="stars small">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={13} fill={star <= rating.rating ? 'currentColor' : 'none'} />)}</div><p>{rating.review}</p><span className="category-tag">{products.find((product) => product.id === rating.product_id)?.name ?? 'General showroom feedback'}</span></div></article>)}</div>
    {!ratings.length && <div className="empty-state">No customer ratings yet.</div>}
  </div>;
}

function OrderModalButton({ onSubmit }: { onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <details className="details-action"><summary className="primary-button"><Plus size={17} /> New order</summary><div className="popover"><form onSubmit={onSubmit}><input name="customer_name" required placeholder="Customer name" /><input name="items_count" type="number" min="1" required placeholder="Items" /><input name="total" type="number" min="0" required placeholder="Order total" /><select name="status" defaultValue="Processing"><option>Processing</option><option>Ready</option><option>Completed</option></select><button className="primary-button" type="submit">Save order</button></form></div></details>;
}

function RatingModalButton({ products, onSubmit }: { products: Product[]; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <details className="details-action"><summary className="secondary-button"><Plus size={16} /> Add rating</summary><div className="popover"><form onSubmit={onSubmit}><input name="customer_name" required placeholder="Customer name" /><select name="product_id" defaultValue=""><option value="">General feedback</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><select name="rating" defaultValue="5"><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select><textarea name="review" required placeholder="Write the customer feedback" /><button className="primary-button" type="submit">Save rating</button></form></div></details>;
}

function Inventory({ products, allProducts, category, onCategoryChange, onAdd, onExport }: {
  products: Product[]; allProducts: Product[]; category: 'All' | 'Bags' | 'Watches';
  onCategoryChange: (category: 'All' | 'Bags' | 'Watches') => void; onAdd: () => void; onExport: () => void;
}) {
  return <div className="content"><PageTitle eyebrow="Product catalog" title="Inventory" description="Keep every bag and watch accounted for, verified, and ready to move." action={<button className="primary-button" onClick={onAdd}><Plus size={17} /> Register product</button>} />
    <div className="filter-row">
      <div className="segmented">
        <button className={category === 'All' ? 'selected' : ''} onClick={() => onCategoryChange('All')}>All items <span>{allProducts.length}</span></button>
        <button className={category === 'Bags' ? 'selected' : ''} onClick={() => onCategoryChange('Bags')}>Bags <span>{allProducts.filter((p) => p.category === 'Bags').length}</span></button>
        <button className={category === 'Watches' ? 'selected' : ''} onClick={() => onCategoryChange('Watches')}>Watches <span>{allProducts.filter((p) => p.category === 'Watches').length}</span></button>
      </div>
      <button className="secondary-button" onClick={onExport}><Download size={16} /> Export list</button>
    </div>
    <section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Unit price</th><th>Quantity</th><th>Status</th><th>Last verified</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><div className="product-cell"><div className={`product-thumb ${product.image_tone}`}><ShoppingBag size={17} /></div><div><strong>{product.name}</strong><span>{product.brand}</span></div></div></td><td className="muted-text">{product.sku}</td><td><span className="category-tag">{product.category}</span></td><td>{formatCurrency(product.price)}</td><td><strong>{product.quantity}</strong> units</td><td><span className={`status-pill ${product.status === 'In stock' ? 'success' : product.status === 'Low stock' ? 'warning' : 'danger'}`}><span />{product.status}</span></td><td className="muted-text">{product.last_verified_at ? formatTime(product.last_verified_at) : 'Not yet'}</td></tr>)}</tbody></table>{!products.length && <div className="empty-state">No products match your search.</div>}</div></section>
  </div>;
}

function CameraScan({ products, scans, isScanning, onScan }: { products: Product[]; scans: Scan[]; isScanning: boolean; onScan: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'ready' | 'blocked'>('idle');
  const [cameraMessage, setCameraMessage] = useState('Connect a webcam or Raspberry Pi camera to begin.');

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) { setCameraState('blocked'); setCameraMessage('This browser does not support camera access.'); return; }
    setCameraState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraState('ready'); setCameraMessage('Live camera connected.');
    } catch { setCameraState('blocked'); setCameraMessage('Camera permission was not granted. Check browser permissions and try again.'); }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState('idle'); setCameraMessage('Camera paused.');
  }

  useEffect(() => () => {
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
  }, []);

  return <div className="content"><PageTitle eyebrow="Computer vision workspace" title="Camera scan" description="Use a webcam or Raspberry Pi camera feed to compare what is on the shelf with your records." action={<button className="primary-button" onClick={onScan} disabled={isScanning || cameraState !== 'ready'}>{isScanning ? <RefreshCw size={17} className="spin" /> : <Camera size={17} />}{isScanning ? 'Scanning…' : 'Count products'}</button>} />
    <div className="scan-layout">
      <section className="panel camera-panel">
        <div className="camera-topline"><span className="live-indicator"><span />{cameraState === 'ready' ? 'Camera live' : cameraState === 'starting' ? 'Connecting…' : 'Camera offline'}</span><span>Webcam · Raspberry Pi compatible</span></div>
        <div className="camera-preview">
          <video ref={videoRef} className={`camera-video ${cameraState === 'ready' ? 'is-live' : ''}`} muted playsInline />
          <div className="camera-placeholder"><Camera size={34} /><strong>{cameraMessage}</strong><span>Use HTTPS or localhost when requesting camera access.</span></div>
          <div className="corner top-left" /><div className="corner top-right" /><div className="corner bottom-left" /><div className="corner bottom-right" />
          {cameraState === 'ready' && <><div className="scan-line" />{isScanning && <div className="scanning-label"><RefreshCw size={16} className="spin" /> Matching products</div>}</>}
          <div className="camera-hud"><span>1280 × 720</span><span>WEBCAM</span><span>NO AUDIO</span></div>
        </div>
        <div className="camera-controls">
          <button className="round-control" onClick={cameraState === 'ready' ? stopCamera : startCamera} aria-label={cameraState === 'ready' ? 'Pause camera' : 'Start camera'}>{cameraState === 'ready' ? <X size={18} /> : <Settings size={18} />}</button>
          <button className="capture-button" onClick={onScan} disabled={isScanning || cameraState !== 'ready'}><span><Camera size={21} /></span></button>
          <button className="round-control" onClick={startCamera} aria-label="Reconnect camera"><RefreshCw size={18} /></button>
        </div>
      </section>
      <section className="panel results-panel">
        <div className="panel-heading"><div><h2>Scan results</h2><p>{scans[0] ? formatTime(scans[0].created_at) : 'Start the live camera before counting'}</p></div><ClipboardCheck size={20} className="heading-icon" /></div>
        <div className="result-summary"><div><strong>{scans[0]?.detected_count ?? '—'}</strong><span>Detected</span></div><div className="result-divider">/</div><div><strong>{scans[0]?.expected_count ?? products.reduce((s, p) => s + p.quantity, 0)}</strong><span>Expected</span></div></div>
        <div className="result-callout"><div className="callout-icon"><CircleAlert size={17} /></div><div><strong>{scans[0]?.status === 'Matched' ? 'Everything matches' : scans[0] ? 'Review recommended' : 'Ready to verify'}</strong><p>{scans[0] ? `${Math.abs(scans[0].discrepancy)} unit difference found on the latest scan.` : 'The current scan service is ready for the Raspberry Pi vision model.'}</p></div></div>
        <div className="result-list">
          <div><span className="result-dot matched" /><span>Recognized products</span><strong>{scans[0]?.detected_count ?? '—'}</strong></div>
          <div><span className="result-dot review" /><span>Needs review</span><strong>{scans[0] ? Math.abs(scans[0].discrepancy) : '—'}</strong></div>
        </div>
      </section>
    </div>
  </div>;
}

function Movements({ products, movements, onAdd }: { products: Product[]; movements: Movement[]; onAdd: () => void }) {
  const stockIn = movements.filter((m) => m.movement_type === 'Stock in').reduce((s, m) => s + m.quantity, 0);
  const stockOut = movements.filter((m) => m.movement_type === 'Stock out').reduce((s, m) => s + m.quantity, 0);
  return <div className="content"><PageTitle eyebrow="Inventory history" title="Stock movements" description="A clear trail of everything entering and leaving your showroom." action={<button className="primary-button" onClick={onAdd}><Plus size={17} /> Record movement</button>} />
    <div className="movement-stats">
      <div className="mini-stat"><ArrowDownToLine size={17} /><span>Stock in (total)</span><strong>+{stockIn} units</strong></div>
      <div className="mini-stat"><ArrowUpRight size={17} /><span>Stock out (total)</span><strong>−{stockOut} units</strong></div>
      <div className="mini-stat"><ClipboardCheck size={17} /><span>Last reconciled</span><strong>Today, 9:42 AM</strong></div>
    </div>
    <section className="panel table-panel">
      <div className="panel-heading"><div><h2>Movement log</h2><p>Every quantity change is recorded for accountability.</p></div></div>
      <div className="table-wrap"><table><thead><tr><th>Type</th><th>Product</th><th>Quantity</th><th>Note</th><th>Date</th></tr></thead><tbody>{movements.map((movement) => <tr key={movement.id}><td><span className={`movement-type ${movement.movement_type === 'Stock in' ? 'in' : 'out'}`}>{movement.movement_type === 'Stock in' ? <ArrowDownToLine size={15} /> : <ArrowUpRight size={15} />}{movement.movement_type}</span></td><td><strong>{products.find((p) => p.id === movement.product_id)?.name ?? 'Product'}</strong></td><td><strong>{movement.movement_type === 'Stock in' ? '+' : '−'}{movement.quantity}</strong></td><td className="muted-text">{movement.note ?? '—'}</td><td className="muted-text">{formatTime(movement.created_at)}</td></tr>)}</tbody></table>{!movements.length && <div className="empty-state">Movement history will appear after your first stock update.</div>}</div>
    </section>
  </div>;
}

// ---- Must-Buy Recommendations ----
function MustBuy({ recommendations, products, loading }: { recommendations: Recommendation[]; products: Product[]; loading: boolean }) {
  return <div className="content"><PageTitle eyebrow="Smart procurement" title="Must-buy recommendations" description="AI-driven restocking suggestions based on stock levels, sales velocity, and order demand." />
    <div className="kpi-grid">
      <Kpi label="High urgency" value={String(recommendations.filter((r) => r.urgency === 'high').length)} change="Reorder now" icon={<CircleAlert size={19} />} tone="rose" negative />
      <Kpi label="Medium urgency" value={String(recommendations.filter((r) => r.urgency === 'medium').length)} change="Plan restock" icon={<Lightbulb size={19} />} tone="amber" />
      <Kpi label="Total suggested units" value={String(recommendations.reduce((s, r) => s + r.suggested_quantity, 0))} change="Across all items" icon={<Package size={19} />} tone="blue" />
      <Kpi label="Estimated cost" value={formatCurrency(recommendations.reduce((s, r) => {
        const product = products.find((p) => p.id === r.product_id);
        return s + (product?.price ?? 0) * r.suggested_quantity;
      }, 0))} change="At current prices" icon={<Archive size={19} />} tone="sage" />
    </div>
    <section className="panel table-panel">
      <div className="panel-heading" style={{ padding: '21px 21px 5px' }}><div><h2>Replenishment priorities</h2><p>Sorted by urgency — tackle top items first.</p></div></div>
      <div className="table-wrap">
        {loading ? <div className="empty-state">Analyzing inventory and sales patterns…</div> :
         recommendations.length ? <table><thead><tr><th>Product</th><th>Brand</th><th>Category</th><th>Urgency</th><th>Suggested qty</th><th>Reason</th></tr></thead><tbody>{recommendations.map((rec) => <tr key={rec.product_id}><td><strong>{rec.name}</strong></td><td className="muted-text">{rec.brand}</td><td><span className="category-tag">{rec.category}</span></td><td><span className={`urgency-badge ${rec.urgency}`}>{rec.urgency}</span></td><td><strong>{rec.suggested_quantity}</strong> units</td><td className="muted-text">{rec.reason}</td></tr>)}</tbody></table> : <div className="empty-state">All products are well-stocked. No urgent restocks needed.</div>}
      </div>
    </section>
  </div>;
}

// ---- Trending Analysis ----
function Trending({ trending, loading }: { trending: TrendingProduct[]; loading: boolean }) {
  const maxScore = Math.max(...trending.map((t) => t.trend_score), 1);
  return <div className="content"><PageTitle eyebrow="Market intelligence" title="Trending product analysis" description="See which products are gaining momentum and which are cooling off, based on movement velocity." />
    <div className="kpi-grid">
      <Kpi label="Rising products" value={String(trending.filter((t) => t.direction === 'rising').length)} change="Gaining momentum" icon={<TrendingUp size={19} />} tone="sage" />
      <Kpi label="Stable products" value={String(trending.filter((t) => t.direction === 'stable').length)} change="Consistent demand" icon={<Package size={19} />} tone="blue" />
      <Kpi label="Declining products" value={String(trending.filter((t) => t.direction === 'declining').length)} change="Slowing down" icon={<ArrowUpRight size={19} />} tone="amber" />
      <Kpi label="Total units moved" value={String(trending.reduce((s, t) => s + t.units_moved, 0))} change="All time" icon={<Archive size={19} />} tone="rose" />
    </div>
    <section className="panel" style={{ padding: '21px' }}>
      <div className="panel-heading"><div><h2>Trend leaderboard</h2><p>Products ranked by movement score (velocity × direction)</p></div></div>
      {loading ? <div className="empty-state">Analyzing movement patterns…</div> :
       trending.length ? <div className="trend-list">{trending.map((t, idx) => (
        <div className="trend-row" key={t.product_id}>
          <span className="trend-rank">{idx + 1}</span>
          <div className="trend-info"><strong>{t.name}</strong><span>{t.brand} · {t.category}</span></div>
          <div className="trend-bar-wrap"><div className={`trend-bar ${t.direction}`} style={{ width: `${Math.round((t.trend_score / maxScore) * 100)}%` }} /></div>
          <div className="trend-meta"><strong>{t.units_moved}</strong><span>units</span></div>
          <span className={`trend-direction ${t.direction}`}>{t.direction === 'rising' ? <TrendingUp size={14} /> : t.direction === 'declining' ? <ArrowUpRight size={14} style={{ transform: 'rotate(90deg)' }} /> : <Package size={14} />}{t.direction}</span>
        </div>
      ))}</div> : <div className="empty-state">No movement data to analyze yet.</div>}
    </section>
  </div>;
}

// ---- Demand Forecasting ----
function Forecast({ forecast, loading }: { forecast: DemandForecast[]; loading: boolean }) {
  return <div className="content"><PageTitle eyebrow="Predictive insights" title="Demand forecasting" description="Projected weekly demand for every product, with stockout estimates and reorder alerts." />
    <div className="kpi-grid">
      <Kpi label="Reorder needed" value={String(forecast.filter((f) => f.reorder_needed).length)} change="Within 4 weeks" icon={<CircleAlert size={19} />} tone="rose" negative />
      <Kpi label="Stockout < 2 weeks" value={String(forecast.filter((f) => f.weeks_until_stockout !== null && f.weeks_until_stockout < 2).length)} change="Critical" icon={<Archive size={19} />} tone="amber" negative />
      <Kpi label="Healthy stock" value={String(forecast.filter((f) => !f.reorder_needed).length)} change="No action needed" icon={<Package size={19} />} tone="sage" />
      <Kpi label="Avg confidence" value={`${forecast.length ? Math.round(forecast.reduce((s, f) => s + f.forecast[0]?.confidence ?? 0, 0) / forecast.length * 100) : 0}%`} change="Week 1 forecast" icon={<LineChart size={19} />} tone="blue" />
    </div>
    <div className="forecast-grid">
      {loading ? <div className="empty-state">Generating demand forecasts…</div> :
       forecast.map((f) => (
        <section className={`panel forecast-card ${f.reorder_needed ? 'reorder' : ''}`} key={f.product_id}>
          <div className="forecast-header">
            <div><strong>{f.name}</strong><span>Current stock: {f.current_stock} units</span></div>
            {f.reorder_needed ? <span className="urgency-badge high">Reorder</span> : <span className="status-pill success"><span />OK</span>}
          </div>
          <div className="forecast-bars">
            {f.forecast.map((point) => {
              const maxDemand = Math.max(...f.forecast.map((p) => p.predicted_demand), 1);
              return <div className="forecast-bar-col" key={point.label}>
                <div className="forecast-bar-track"><div className="forecast-bar-fill" style={{ height: `${Math.round((point.predicted_demand / maxDemand) * 100)}%` }} /></div>
                <span className="forecast-bar-label">{point.label}</span>
                <span className="forecast-bar-value">{point.predicted_demand}</span>
              </div>;
            })}
          </div>
          <div className="forecast-footer">
            <span>Stockout in: <strong>{f.weeks_until_stockout !== null ? (f.weeks_until_stockout === 0 ? 'now' : `${f.weeks_until_stockout} wk`) : 'N/A'}</strong></span>
            <span>Confidence: <strong>{Math.round((f.forecast[0]?.confidence ?? 0) * 100)}%</strong></span>
          </div>
        </section>
      ))}
    </div>
  </div>;
}

// ---- Enhanced Reports ----
function Reports({ products, scans, totalValue, weeklyReport, recommendations, trending, onExport, loading }: {
  products: Product[]; scans: Scan[]; totalValue: number; weeklyReport: WeeklyReport | null;
  recommendations: Recommendation[]; trending: TrendingProduct[]; onExport: () => void; loading: boolean;
}) {
  return <div className="content"><PageTitle eyebrow="Insights & exports" title="Reports" description="Weekly inventory health, verification accuracy, demand forecasts, and full CSV export." action={<button className="secondary-button" onClick={onExport}><Download size={16} /> Export report</button>} />
    {loading || !weeklyReport ? <div className="empty-state">Generating weekly report…</div> : <>
      <div className="report-grid">
        <div className="report-hero">
          <div>
            <span className="eyebrow">{weeklyReport.week_label}</span>
            <h2>{formatCurrency(weeklyReport.inventory_value)}</h2>
            <p>Estimated value held across {products.length} registered products.</p>
            <div className="report-hero-stats">
              <div><strong>+{weeklyReport.total_stock_in}</strong><span>Stock in</span></div>
              <div><strong>−{weeklyReport.total_stock_out}</strong><span>Stock out</span></div>
              <div><strong>{weeklyReport.net_change >= 0 ? '+' : ''}{weeklyReport.net_change}</strong><span>Net change</span></div>
            </div>
          </div>
          <div className="report-orbit"><FileBarChart size={28} /></div>
        </div>
        <section className="panel report-card">
          <div className="panel-heading"><div><h2>Verification accuracy</h2><p>Last 30 days</p></div><span className="accuracy">{scans.length ? `${Math.round((scans.filter((s) => s.status === 'Matched').length / scans.length) * 100)}%` : '—'}</span></div>
          <div className="accuracy-bar"><span style={{ width: `${scans.length ? Math.round((scans.filter((s) => s.status === 'Matched').length / scans.length) * 100) : 100}%` }} /></div>
          <div className="report-row"><span>Matched scans</span><strong>{scans.filter((s) => s.status === 'Matched').length}</strong></div>
          <div className="report-row"><span>Scans needing review</span><strong>{scans.filter((s) => s.status === 'Review').length}</strong></div>
        </section>
        <section className="panel report-card">
          <div className="panel-heading"><div><h2>Category value</h2><p>Current estimated value</p></div></div>
          <div className="category-bars">
            <div><span><b>Bags</b><b>{formatCurrency(products.filter((p) => p.category === 'Bags').reduce((s, p) => s + p.quantity * p.price, 0))}</b></span><i style={{ width: '78%' }} /></div>
            <div><span><b>Watches</b><b>{formatCurrency(products.filter((p) => p.category === 'Watches').reduce((s, p) => s + p.quantity * p.price, 0))}</b></span><i style={{ width: '54%' }} /></div>
          </div>
        </section>
      </div>

      {/* Weekly report detail */}
      <div className="lower-grid" style={{ marginTop: '17px' }}>
        <section className="panel">
          <div className="panel-heading"><div><h2>Top moving products</h2><p>Highest movement velocity this period</p></div><TrendingUp size={20} className="heading-icon" /></div>
          {weeklyReport.top_moving.length ? weeklyReport.top_moving.map((t) => (
            <div className="activity-row" key={t.product_id}>
              <div className={`activity-icon ${t.direction === 'rising' ? 'in' : 'out'}`}><TrendingUp size={16} /></div>
              <div><strong>{t.name}</strong><span>{t.brand} · {t.units_moved} units moved</span></div>
              <b>{t.trend_score}</b>
            </div>
          )) : <div className="empty-state">No movement data this period.</div>}
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Reorder alerts</h2><p>Products needing restock soon</p></div><Lightbulb size={20} className="heading-icon" /></div>
          {weeklyReport.forecast_summary.length ? weeklyReport.forecast_summary.map((f) => (
            <div className="activity-row" key={f.product_id}>
              <div className="activity-icon out"><CircleAlert size={16} /></div>
              <div><strong>{f.name}</strong><span>Stockout in {f.weeks_until_stockout === 0 ? 'now' : `${f.weeks_until_stockout} wk`} · {f.current_stock} in stock</span></div>
              <b className="urgency-badge high">{f.reorder_needed ? 'Reorder' : 'OK'}</b>
            </div>
          )) : <div className="empty-state">No reorders needed right now.</div>}
        </section>
      </div>

      {/* Recommendations summary */}
      <div className="lower-grid" style={{ marginTop: '17px' }}>
        <section className="panel">
          <div className="panel-heading"><div><h2>Must-buy summary</h2><p>{recommendations.length} items flagged for procurement</p></div><Lightbulb size={20} className="heading-icon" /></div>
          {recommendations.length ? recommendations.slice(0, 5).map((rec) => (
            <div className="activity-row" key={rec.product_id}>
              <div className={`activity-icon ${rec.urgency === 'high' ? 'out' : 'in'}`}><Lightbulb size={16} /></div>
              <div><strong>{rec.name}</strong><span>{rec.reason}</span></div>
              <b className={`urgency-badge ${rec.urgency}`}>{rec.urgency}</b>
            </div>
          )) : <div className="empty-state">No recommendations at this time.</div>}
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Full trend ranking</h2><p>All products by movement score</p></div></div>
          {trending.length ? trending.slice(0, 5).map((t) => (
            <div className="activity-row" key={t.product_id}>
              <div className={`activity-icon ${t.direction === 'rising' ? 'in' : 'out'}`}><TrendingUp size={16} /></div>
              <div><strong>{t.name}</strong><span>{t.brand} · {t.direction}</span></div>
              <b>{t.trend_score}</b>
            </div>
          )) : <div className="empty-state">No trending data available.</div>}
        </section>
      </div>
    </>}
  </div>;
}

function AddProductModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal"><div className="modal-header"><div><span className="eyebrow">Product registration</span><h2>Add a product</h2></div><button className="close-button" onClick={onClose}><X size={18} /></button></div><form onSubmit={onSubmit}><div className="form-grid"><label>Product name<input name="name" required placeholder="e.g. Lady Dior Small" /></label><label>Brand<input name="brand" required placeholder="e.g. Dior" /></label><label>SKU<input name="sku" required placeholder="e.g. CJVB-004" /></label><label>Category<select name="category" defaultValue="Bags"><option>Bags</option><option>Watches</option></select></label><label>Unit price<input name="price" type="number" min="0" required placeholder="0" /></label><label>Opening quantity<input name="quantity" type="number" min="0" required placeholder="0" /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Check size={16} /> Save product</button></div></form></div></div>;
}

function MovementModal({ products, onClose, onSubmit }: { products: Product[]; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal"><div className="modal-header"><div><span className="eyebrow">Stock control</span><h2>Record movement</h2></div><button className="close-button" onClick={onClose}><X size={18} /></button></div><form onSubmit={onSubmit}><div className="form-grid"><label>Product<select name="product_id" required defaultValue={products[0]?.id}>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.quantity} units</option>)}</select></label><label>Movement type<select name="movement_type" defaultValue="Stock in"><option>Stock in</option><option>Stock out</option></select></label><label>Quantity<input name="quantity" type="number" min="1" required placeholder="1" /></label><label>Note<input name="note" placeholder="e.g. New delivery" /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Check size={16} /> Save movement</button></div></form></div></div>;
}

export default App;
