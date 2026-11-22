import { exportPriceList } from './priceListExport';
import { renderReceipt, downloadReceipt } from './receiptImage';
import React, { useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, CalendarDays, Package, Tags, ShoppingBag, Calculator, ShieldCheck, Settings, Flower2, Bell, Search, Plus, Trash2, Pencil, ImagePlus, CheckCircle2, Circle, LogOut, Moon, Sun, Printer, Menu, X, ArrowUpRight, AlertTriangle, Clock, ClipboardList, Heart, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api, money, date } from './api';
const warrantyDaysRemaining = (expiry) => {
  const e = String(expiry || '').slice(0, 10);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return Math.round((Date.parse(e + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
};
const eventMatchesDay = (event, day) => {
  const start = String(event.date || '').slice(0, 10);
  const target = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  if (!start || target < start)
    return false;
  if (target === start)
    return true;
  const repeat = event.repeat || 'none';
  if (repeat === 'none')
    return false;
  const [y, m, d] = start.split('-').map(Number);
  if (repeat === 'week')
    return Math.round((Date.parse(target + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000) % 7 === 0;
  if (repeat === 'year')
    return day.getMonth() + 1 === m && day.getDate() === Math.min(d, new Date(day.getFullYear(), m, 0).getDate());
  if (repeat === 'month')
    return day.getDate() === Math.min(d, new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate());
  return false;
};
const warrantyStatus = (s) => {
  const remaining = warrantyDaysRemaining(s.warrantyExpiry);
  return remaining < 0 ? 'expired' : remaining <= 7 ? 'expiring' : 'active';
};
const NAV = [['Dashboard', LayoutDashboard], ['My Planner', CalendarDays], ['Inventory', Package], ['Price List', Tags], ['Orders', ShoppingBag], ['Price Calculator', Calculator], ['Subscriptions & Warranty', ShieldCheck], ['Settings', Settings]];
const occasions = [{ name: "Valentine's Day", month: 2, day: 14, emoji: '💜', note: 'Bouquets, flowers & couple keychains' }, { name: "Mother's Day", month: 5, day: 0, week: 2, emoji: '🌸', note: 'Bouquets and personalized gifts' }, { name: "Father's Day", month: 6, day: 0, week: 3, emoji: '🎁', note: 'Keychains and gift sets' }, { name: 'Christmas Day', month: 12, day: 25, emoji: '🎄', note: 'Holiday gifts and bundles' }];
function occasionDate(o, year) {
  if (!o.week)
    return new Date(year, o.month - 1, o.day);
  const first = new Date(year, o.month - 1, 1), day = 1 + (7 - first.getDay()) % 7 + (o.week - 1) * 7;
  return new Date(year, o.month - 1, day);
}
const field = (label, key, type = 'text', extra = {}) =>
  <label className="field" key={key}>
    <span>{label}
    </span>
    <input
      name={key}
      type={type}
      required={extra.required !== false}
      defaultValue={extra.value ?? ''}
      min={type === 'number' ? 0 : undefined}
      step={type === 'number' ? 'any' : undefined} />
  </label>;
const defaultPriceGroups = { Flowers: ['Single', 'Bouquet'], Keychains: ['Figures', 'Random'], 'Premium Accounts': ['ChatGPT', 'Canva', 'CapCut', 'Microsoft 365', 'Spotify'] };
function inferPriceSubcategory(p) {
  if (p?.subcategory && p.subcategory !== 'Materials')
    return p.subcategory;
  if (p?.category === 'Premium Accounts') {
    const name = String(p?.name || '').toLowerCase();

    return defaultPriceGroups['Premium Accounts'].find(x => name.includes(x.toLowerCase())) || 'Uncategorized';
  }
  return p?.category === 'Keychains' ? 'Random' : 'Single';
}
function App() {
  const [token, setToken] = useState(localStorage.getItem('scs_token') || '');

  const [page, setPage] = useState('Dashboard');

  const [dark, setDark] = useState(localStorage.getItem('scs_theme') === 'dark');

  const [menu, setMenu] = useState(false);

  const [data, setData] = useState({ products: [], materials: [], orders: [], subs: [], tasks: [] });

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);

  const [tab, setTab] = useState('Calendar');

  const [modal, setModal] = useState('');

  const [search, setSearch] = useState('');

  const [month, setMonth] = useState(new Date());

  const [receipt, setReceipt] = useState([]);

  const [discount, setDiscount] = useState(0);

  const [events, setEvents] = useState([]);

  const [customers, setCustomers] = useState([]);

  const [login, setLogin] = useState({ email: 'admin@scs.local', password: '' });

  const [busy, setBusy] = useState(false);

  const [manual, setManual] = useState(false);

  const [editing, setEditing] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState('');

  const [otherPayment, setOtherPayment] = useState('');

  const [chosenOrder, setChosenOrder] = useState('');

  const [receiptImage, setReceiptImage] = useState('');

  const [receiptNumber, setReceiptNumber] = useState('');

  const [receiptCustomer, setReceiptCustomer] = useState({ name: '', address: '', contact: '' });

  const [taskImage, setTaskImage] = useState('');

  const [orderCategory, setOrderCategory] = useState('Flowers');

  const [calcCategory, setCalcCategory] = useState('Premium Accounts');

  const [calcProduct, setCalcProduct] = useState('');

  const [calcCost, setCalcCost] = useState('1100');

  const [calcSelling, setCalcSelling] = useState('225');

  const [calcCustomers, setCalcCustomers] = useState('10');

  const [flowerMaterials, setFlowerMaterials] = useState([]);

  const [labor, setLabor] = useState('85');

  const [salesDetails, setSalesDetails] = useState(false);

  const [warrantyFilter, setWarrantyFilter] = useState('all');

  const [hiddenSubcategories, setHiddenSubcategories] = useState({});

  const [orderItems, setOrderItems] = useState([{ key: 1, productId: '', quantity: 1 }]);

  const [productImage, setProductImage] = useState('');

  const [priceExportSelection, setPriceExportSelection] = useState(['Flowers', 'Keychains', 'Premium Accounts']);

  const [priceExportFormat, setPriceExportFormat] = useState('pdf');

  const [showPriceExport, setShowPriceExport] = useState(false);

  const [productCategory, setProductCategory] = useState('Flowers');

  const [inventoryTab, setInventoryTab] = useState('Materials');

  const [inventoryFilter, setInventoryFilter] = useState('All');

  const [materialGroup, setMaterialGroup] = useState('Others');

  const [materialImage, setMaterialImage] = useState('');

  const [pricelistMaterials, setPricelistMaterials] = useState([]);

  const [materialSupplierCost, setMaterialSupplierCost] = useState('0');

  const [materialPieceCost, setMaterialPieceCost] = useState('');

  const [materialPackSize, setMaterialPackSize] = useState('1');

  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));

  const craftGroups = ['Pen', 'Wrapper', 'Fuzzy Wire', 'Others', ...(data.inventoryCategories?.craft || [])].filter((v, i, a) => a.indexOf(v) === i);

  const premiumGroups = (data.inventoryCategories?.premium || ['ChatGPT', 'Canva', 'CapCut', 'Others']).filter((v, i, a) => a.indexOf(v) === i);

  const guessGroup = (name, kind) => {
    const n = String(name || '').toLowerCase();
    if (kind === 'craft')
      return n.includes('pen') ? 'Pen' : n.includes('wrapper') ? 'Wrapper' : n.includes('fuzzy') || n.includes('fuzzi') ? 'Fuzzy Wire' : 'Others';
    return n.includes('chatgpt') || n.includes('gpt') ? 'ChatGPT' : n.includes('canva') ? 'Canva' : n.includes('capcut') ? 'CapCut' : 'Others';
  };

  const groupOf = (item, kind) => item.inventoryGroup || guessGroup(item.name, kind);

  async function addInventoryCategory() {
    const kind = inventoryTab === 'Materials' ? 'craft' : 'premium';
    const name = window.prompt('New ' + (kind === 'craft' ? 'craft material' : 'premium account') + ' category name:');
    if (!name || !name.trim())
      return;
    try {
      setBusy(true);

      await api('/inventory-categories', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: JSON.stringify({ kind, name: name.trim() }) });

      await refresh();

      setInventoryFilter(name.trim());

    }
    catch (e) {
      setError(e.message);

    }
    finally {
      setBusy(false);

    }
  }

  async function renameInventoryCategory() {
    const kind = inventoryTab === 'Materials' ? 'craft' : 'premium';
    if (inventoryFilter === 'All') {
      setError('Select a category to rename first.');

      return;

    }
    const oldName = inventoryFilter;
    const name = window.prompt('Rename category ' + oldName + ' to:', oldName)?.trim();
    if (!name || name === oldName)
      return;
    try {
      setBusy(true);

      await api('/inventory-categories', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token }, body: JSON.stringify({ kind, oldName, name }) });

      setInventoryFilter(name);

      await refresh();

      setError('');

    }
    catch (e) {
      setError(e.message);

    }
    finally {
      setBusy(false);

    }
  }

  async function deleteInventoryCategory() {
    const kind = inventoryTab === 'Materials' ? 'craft' : 'premium';
    if (inventoryFilter === 'All') {
      setError('Select a category to delete first.');

      return;

    }
    const name = inventoryFilter;
    const assigned = (kind === 'premium' ? data.products.filter(p => p.category === 'Premium Accounts') : data.materials).filter(p => groupOf(p, kind) === name).length;
    if (assigned) {
      setError(`Cannot delete ${name}: ${assigned} item(s) still use it. Move those items to another category first.`);

      return;

    }
    if (!window.confirm('Delete the ' + name + ' category? This cannot be undone.'))
      return;
    try {
      setBusy(true);

      await api('/inventory-categories', { method: 'DELETE', headers: { Authorization: 'Bearer ' + token }, body: JSON.stringify({ kind, name }) });

      setInventoryFilter('All');

      await refresh();

      setError('');

    }
    catch (e) {
      setError(e.message);

    }
    finally {
      setBusy(false);

    }
  }

  const number = v => Math.max(0, Number(v) || 0);

  const unitCost = p => {
    if (!p)
      return 0;
    const stored = p.costPerPiece;
    if (stored !== undefined && stored !== null && stored !== '' && Number.isFinite(Number(stored)))
      return number(stored);
    const pack = Math.max(1, Number(p.packSize) || 1);
    return number(p.cost) / pack;
  };

  const previewUnitCost = Number(materialPieceCost) || 0;

  const premiumRevenue = number(calcSelling) * number(calcCustomers);

  const premiumProfit = premiumRevenue - number(calcCost);

  const materialTotal = flowerMaterials.reduce((sum, m) => {
    const p = data.materials.find(p => p.id === Number(m.productId));
    return sum + number(m.qty) * unitCost(p);
  }, 0);

  const pricelistMaterialTotal = pricelistMaterials.reduce((sum, m) => {
    const p = data.products.find(p => p.id === Number(m.productId));
    return sum + number(m.qty) * number(p?.price);
  }, 0);

  const flowerTotal = materialTotal + (calcCategory === 'Flowers' ? pricelistMaterialTotal : 0) + number(labor);

  const selectedOrder = data.orders.find(o => String(o.id) === String(chosenOrder));

  const currentItems = selectedOrder ? selectedOrder.items.map(i => ({ name: i.product?.name || 'Product', qty: i.quantity, price: i.unitPrice })) : receipt;

  const receiptSubtotal = currentItems.reduce((a, i) => a + number(i.qty) * number(i.price), 0);

  const receiptTotal = Math.max(0, receiptSubtotal - number(discount));

  const addReceiptItem = () => {
    const id = 'manual-' + Date.now() + '-' + Math.random();
    setReceipt(v => [...v, { id, name: '', qty: 1, price: 0 }]);
    setReceiptImage('');
  };

  const updateReceiptItem = (id, key, value) => {
    setReceipt(v => v.map(i => i.id === id ? { ...i, [key]: value } : i));
    setReceiptImage('');
  };

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('scs_theme', dark ? 'dark' : 'light');
  }, [dark]);

  async function refresh() {
    if (!token)
      return;
    try {
      setLoading(true);

      const [d, e, c] = await Promise.all([api('/overview', { headers: { Authorization: 'Bearer ' + token } }), api('/events', { headers: { Authorization: 'Bearer ' + token } }), api('/customers', { headers: { Authorization: 'Bearer ' + token } })]);

      setData(d);

      setEvents(e);

      setCustomers(c);

      setError('');

    }
    catch (e) {
      setError(e.message);

      if (e.message === 'Please sign in')
        logout();

    }
    finally {
      setLoading(false);

    }
  }

  useEffect(() => {
    refresh();
  }, [token]);

  function logout() {
    localStorage.removeItem('scs_token');
    setToken('');
    setPage('Dashboard');
  }

  async function loginSubmit(e) {
    e.preventDefault();
    try {
      setBusy(true);

      const result = await api('/login', { method: 'POST', body: JSON.stringify(login) });

      localStorage.setItem('scs_token', result.token);

      setToken(result.token);

      setError('');

    }
    catch (e) {
      setError(e.message);

    }
    finally {
      setBusy(false);

    }
  }

  async function mutate(path, method = 'POST', body) {
    try {
      setBusy(true);

      await api(path, { method, headers: { Authorization: 'Bearer ' + token }, ...(body ? { body: JSON.stringify(body) } : {}) });

      setModal('');

      setError('');

      await refresh();

    }
    catch (e) {
      setError(e.message);

    }
    finally {
      setBusy(false);

    }
  }

  function formSubmit(e) {
    e.preventDefault();
    const obj = Object.fromEntries(new FormData(e.currentTarget));
    if (modal === 'premium-stock')
      mutate('/premium-inventory/' + editing.id, 'PATCH', { stock: Number(obj.stock), cost: Number(obj.cost), reorderAt: Number(obj.reorderAt), inventoryGroup: obj.inventoryGroup, image: productImage });
    if (modal === 'material') {
      const pack = Number(materialPackSize), cost = Number(materialSupplierCost), piece = Number(materialPieceCost);

      if (!Number.isSafeInteger(pack) || pack < 1 || materialSupplierCost === '' || materialPieceCost === '' || !Number.isFinite(cost) || cost < 0 || !Number.isFinite(piece) || piece < 0) {
        setError('Enter a valid supplier pack cost, independent cost per piece, and units per purchase pack.');

        return;

      }

      mutate(editing ? '/materials/' + editing.id : '/materials', editing ? 'PATCH' : 'POST', { ...obj, inventoryGroup: obj.inventoryGroup, image: materialImage, cost, costPerPiece: piece, stock: +obj.stock, reorderAt: +obj.reorderAt, packSize: pack });

    }
    if (modal === 'product')
      mutate(editing ? '/products/' + editing.id : '/products', editing ? 'PATCH' : 'POST', { name: obj.name, category: obj.category, subcategory: obj.subcategory || '', price: +obj.price, image: productImage || editing?.image || '' });
    if (modal === 'task')
      mutate(editing ? '/tasks/' + editing.id : '/tasks', editing ? 'PATCH' : 'POST', { title: obj.title, notes: obj.notes || '', image: taskImage || null, completed: editing?.completed || false, scheduledAt: obj.scheduledAt ? new Date(obj.scheduledAt).toISOString() : null });
    if (modal === 'event')
      mutate(editing ? '/events/' + editing.id : '/events', editing ? 'PATCH' : 'POST', { title: obj.title.trim(), date: obj.date, repeat: obj.repeat || 'none', type: 'Custom' });
    if (modal === 'order') {
      const items = orderItems.map(i => ({ productId: Number(i.productId), quantity: Number(i.quantity) }));

      if (items.length === 0 || items.some(i => !i.productId || !Number.isSafeInteger(i.quantity) || i.quantity < 1)) {
        setError('Choose a valid product and quantity for every order item.');

        return;

      }

      mutate(editing ? '/orders/' + editing.id : '/orders', editing ? 'PATCH' : 'POST', { ...obj, items, purchaseDate: obj.purchaseDate, warrantyDuration: Number(obj.warrantyDuration || 0), warrantyUnit: obj.warrantyUnit || 'days', warrantyStart: obj.purchaseDate, device: obj.device || '' });

    }
    if (modal === 'subscription')
      mutate('/subscriptions', 'POST', { ...obj, customerId: +obj.customerId, price: +obj.price, warrantyDays: +obj.warrantyDays, paid: obj.paid === 'true', subscriptionExpiry: obj.subscriptionExpiry ? new Date(obj.subscriptionExpiry).toISOString() : null });
  }

  const addPriceSubcategory = async () => {
    const category = window.prompt('Which category? Enter Flowers, Keychains, or Premium Accounts:', 'Premium Accounts');
    if (!category)
      return;
    const matched = ['Flowers', 'Keychains', 'Premium Accounts'].find(c => c.toLowerCase() === category.trim().toLowerCase());
    if (!matched) {
      setError('Choose Flowers, Keychains or Premium Accounts.');

      return;

    }
    const name = window.prompt('New subcategory name (e.g., Canva, 30 Days, 1 Year):');
    if (!name?.trim())
      return;
    try {
      setBusy(true);

      await api('/pricelist-subcategories', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: JSON.stringify({ category: matched, name: name.trim() }) });

      await refresh();

      setError('');

    }
    catch (e) {
      setError(e.message);

    }
    finally {
      setBusy(false);

    }
  };

  const openNew = kind => {
    setEditing(null);
    setTaskImage('');
    setProductImage('');
    if (kind === 'material') {
      setMaterialImage('');

      setMaterialGroup('Others');

      setMaterialSupplierCost('0');

      setMaterialPieceCost('');

      setMaterialPackSize('1');

    }
    if (kind === 'product')
      setProductCategory('Flowers');
    if (kind === 'order') {
      setOrderCategory('Flowers');

      setOrderItems([{ key: Date.now(), productId: '', quantity: 1 }]);

    }
    setModal(kind);
  };

  const editRow = (kind, row) => {
    setEditing(row);
    setTaskImage(row.image || '');
    setProductImage(row.image || '');
    if (kind === 'material') {
      setMaterialImage(row.image || '');

      setMaterialGroup(row.inventoryGroup || guessGroup(row.name, 'craft'));

      setMaterialSupplierCost(String(row.cost ?? 0));

      setMaterialPieceCost(row.costPerPiece === undefined || row.costPerPiece === null ? '' : String(row.costPerPiece));

      setMaterialPackSize(String(row.packSize ?? 1));

    }
    if (kind === 'product')
      setProductCategory(row.category || 'Flowers');
    if (kind === 'order') {
      setOrderCategory(row.items?.[0]?.product?.category || 'Flowers');

      setOrderItems((row.items || []).map((i, index) => ({ key: index + 1, productId: String(i.productId), quantity: i.quantity })));

    }
    setModal(kind);
  };

  async function uploadTaskImage(e) {
    const file = e.target.files?.[0];
    if (!file)
      return;
    if (!file.type.startsWith('image/') || file.size > 1800000) {
      setError('Choose an image smaller than 1.8 MB');

      return;

    }
    const reader = new FileReader();
    reader.onload = () => setTaskImage(reader.result);
    reader.readAsDataURL(file);
  }

  async function deleteOrder(o) {
    if (!window.confirm('Delete order #' + String(o.id).padStart(4, '0') + '? This will also remove its linked receipt and automatically generated warranty. This action cannot be undone.'))
      return;
    try {
      setBusy(true);

      await api('/orders/' + o.id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });

      await refresh();

      if (String(chosenOrder) === String(o.id)) {
        setChosenOrder('');

        setReceiptImage('');

      }

      setError('');

    }
    catch (e) {
      setError(e.message);

    }
    finally {
      setBusy(false);

    }
  }

  async function printOrderReceipt(o) {
    try {
      setBusy(true);

      const priorReceipts = await api('/receipts', { headers: { Authorization: 'Bearer ' + token } });

      const prior = priorReceipts.find(r => r.orderId === o.id);

      const result = await api('/receipts', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: JSON.stringify({ orderId: o.id, paymentMethod: prior?.paymentMethod || 'Not specified', otherPayment: prior?.otherPayment || '', discount: prior?.discount || 0 }) });

      const image = await renderReceipt(result);

      downloadReceipt(image, result.orNumber);

      setError('');

    }
    catch (e) {
      setError(e.message);

    }
    finally {
      setBusy(false);

    }
  }

  async function generateImage() {
    try {
      if (!paymentMethod)
        throw Error('Choose a payment method before generating the receipt');

      if (!chosenOrder && !receiptCustomer.name.trim())
        throw Error('Enter customer name');

      if (Number(discount) > receiptSubtotal)
        throw Error('Discount exceeds the subtotal');

      setBusy(true);

      const result = await api('/receipts', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: JSON.stringify({ orderId: chosenOrder ? Number(chosenOrder) : null, paymentMethod, otherPayment, items: receipt.map(x => ({ name: x.name, qty: x.qty, price: x.price })), discount: Number(discount), customerName: receiptCustomer.name, customerAddress: receiptCustomer.address, customerContact: receiptCustomer.contact, receiptDate }) });

      const image = await renderReceipt(result);

      setReceiptImage(image);

      setReceiptNumber(result.orNumber);

      setError('');

    }
    catch (e) {
      setError(e.message);

    }
    finally {
      setBusy(false);

    }
  }

  const today = new Date(), year = today.getFullYear();

  const upcoming = occasions.map(o => {
    let d = occasionDate(o, year);
    if (d < new Date(today.getFullYear(), today.getMonth(), today.getDate()))
      d = occasionDate(o, year + 1);
    return { ...o, date: d };
  }).sort((a, b) => a.date - b.date);

  const paidOrders = data.orders.filter(o => o.paymentStatus === 'Paid');

  const sales = paidOrders.reduce((s, o) => s + o.total, 0);

  const low = [...data.materials.filter(p => p.stock <= p.reorderAt), ...data.products.filter(p => p.category === 'Premium Accounts' && Number(p.stock || 0) <= Number(p.reorderAt ?? 2))];

  const active = data.subs.filter(s => warrantyDaysRemaining(s.warrantyExpiry) >= 0);

  const expiring = active.filter(s => warrantyStatus(s) === 'expiring');

  const expired = data.subs.filter(s => warrantyStatus(s) === 'expired');

  const upcomingTasks = data.tasks.filter(t => !t.completed);

  const filtered = items => items.filter(i => JSON.stringify(i).toLowerCase().includes(search.toLowerCase()));

  const saveTask = (t, patch) => mutate('/tasks/' + t.id, 'PATCH', patch);

  const navTo = n => {
    setPage(n);
    setSearch('');
    setWarrantyFilter('all');
    setMenu(false);
  };

  const showWarranties = (filter) => {
    setWarrantyFilter(filter);
    setSearch('');
    setPage('Subscriptions & Warranty');
    setMenu(false);
  };

  const deleteEvent = (event) => {
    if (window.confirm('Delete \"' + event.title + '\"? ' + (event.repeat && event.repeat !== 'none' ? 'This will remove all future occurrences of this recurring event.' : 'This cannot be undone.')))
      mutate('/events/' + event.id, 'DELETE');
  };

  const btn = (label, action) =>
    <button className="primary" onClick={action}>
      <Plus size={16} />{label}
    </button>;

  if (!token)
    return <div className="login-bg">
    <form className="login-card" onSubmit={loginSubmit}>
      <div className="logo-big">
        <img
          src={`${import.meta.env.BASE_URL}scs-logo.png`}
          className="login-logo"
          alt="Shane Creative Studio" /> SCS StudioHub</div>
      <p>Your beautiful space to manage business.</p>
      <h2>Welcome back</h2>
      <label>Email
        <input
          type="email"
          required
          value={login.email}
          onChange={e => setLogin({ ...login, email: e.target.value })} />
      </label>
      <label>Password
        <input
          type="password"
          required
          value={login.password}
          onChange={e => setLogin({ ...login, password: e.target.value })} />
      </label>{error &&
        <div className="error">{error}
        </div>}
      <button className="primary wide" disabled={busy}>Sign in</button>
      <small>Demo after seeding: admin@scs.local / ChangeMe123! — change before deployment.</small>
    </form>
  </div>;

  return <div className="app">
    <aside className={'sidebar ' + (menu ? 'open' : '')}>
      <div className="brand">
        <img
          className="brand-logo"
         src={`${import.meta.env.BASE_URL}scs-logo.png`}
          alt="Shane Creative Studio logo" />
        <div>
          <strong>SCS
            <br />StudioHub</strong>
          <small>SHANE CREATIVE STUDIO</small>
        </div>
        <button className="mobile-close" onClick={() => setMenu(false)}>
          <X />
        </button>
      </div>
      <nav>{NAV.map(([n, I]) =>
        <button
          key={n}
          className={'nav-item ' + (page === n ? 'selected' : '')}
          onClick={() => navTo(n)}>
          <I size={20} />
          <span>{n}
          </span>{n === 'My Planner' &&
            <ChevronRight size={16} className="nav-chevron" />}
        </button>)}
      </nav>
      <div className="sidebar-bottom">
        <button className="logout" onClick={() => {
          if (window.confirm("Sign out of SCS StudioHub?"))
            logout();
        }}>
          <LogOut size={17} /> Log Out</button>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMenu(true)}>
          <Menu />
        </button>
        <div className="page-intro">
          <h1>
            <span className="heading-flower">✿</span> {page}
          </h1>
          <p>{page === 'Dashboard' ? "Welcome back! Here's an overview of your business today." : 'Organize your creative business beautifully.'}
          </p>
        </div>
        <div className="top-actions">
          <div className="date-pill">
            <CalendarDays size={17} />{today.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <button
            className="icon-button"
            title="Toggle theme"
            onClick={() => setDark(!dark)}>{dark ?
              <Sun /> :
              <Moon />}
          </button>
          <div className="profile">
            <div className="avatar">S</div>
            <span>
              <b>Shane</b>
              <small>Owner</small>
            </span>
          </div>
          <button
            type="button"
            className="header-logout"
            title="Log out"
            onClick={() => {
              if (window.confirm("Sign out of SCS StudioHub?"))
                logout();
            }}>
            <LogOut size={16} /> Log Out</button>
        </div>
      </header>{error &&
        <div className="error banner">{error}
          <button onClick={() => setError('')}>×</button>
        </div>}{loading &&
          <div className="loading">Updating your studio…</div>}

      <main>{page === 'Dashboard' && <>
        <div className="stat-grid">{[[ShoppingBag, 'Total Orders', data.orders.length, '+ Orders'], [ArrowUpRight, 'Total Sales', money(sales), 'Paid orders'], [ShieldCheck, 'Active Warranties', active.length - expiring.length, 'Currently covered'], [Package, 'Low Stock Items', low.length, 'Restock soon']].map(([I, title, val, sub]) =>
          <button
            type="button"
            className="stat card stat-button"
            key={title}
            onClick={() => title === 'Total Sales' ? setSalesDetails(v => !v) : title === 'Active Warranties' ? showWarranties('active') : navTo(title === 'Total Orders' ? 'Orders' : 'Inventory')}>
            <div className="stat-icon">
              <I size={28} />
            </div>
            <div>
              <span>{title}
              </span>
              <h2>{val}
              </h2>
              <small>{sub}
              </small>
            </div>
          </button>)}
        </div>{salesDetails &&
          <section className="card sales-breakdown">
            <div className="card-title">
              <h3>Sales by Category & Sold Products</h3>
              <button className="outline" onClick={() => setSalesDetails(false)}>Close</button>
            </div>{['Flowers', 'Keychains', 'Premium Accounts'].map(category => {
              const items = paidOrders.flatMap(o => o.items.map(it => ({ ...it, order: o }))).filter(it => it.product?.category === category);
              return <div className="sales-category" key={category}>
                <h4>{category} — {money(items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0))}
                </h4>{items.length ? items.map((it, i) =>
                  <div className="sales-line" key={i}>
                    <span>{it.product?.name || 'Deleted product'} × {it.quantity} · {it.order.customer?.name || 'Customer'}
                    </span>
                    <b>{money(it.quantity * it.unitPrice)}
                    </b>
                  </div>) :
                  <p className="hint">No paid sales yet.</p>}
              </div>;
            })}
          </section>}
        <div className="dashboard-row">
          <section className="card sales-card">
            <div className="card-title">
              <h3>♧ Sales Overview</h3>
              <span className="muted">Paid orders</span>
            </div>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={Array.from({ length: 7 }, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (6 - i));
                  return { name: d.toLocaleDateString('en', { weekday: 'short' }), sales: paidOrders.filter(o => new Date(o.createdAt).toDateString() === d.toDateString()).reduce((s, o) => s + o.total, 0) };
                })}>
                  <defs>
                    <linearGradient
                      id="purpleFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1">
                      <stop
                        offset="0%"
                        stopColor="#a867d7"
                        stopOpacity={.4} />
                      <stop
                        offset="100%"
                        stopColor="#a867d7"
                        stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#eee6f3" />
                  <XAxis dataKey="name" />
                  <YAxis width={55} />
                  <Tooltip formatter={v => money(v)} />
                  <Area
                    dataKey="sales"
                    type="monotone"
                    stroke="#8240ae"
                    strokeWidth={3}
                    fill="url(#purpleFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="card performance">
            <h3>♧ Product Performance</h3>
            <div className="donut">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={['Flowers', 'Keychains', 'Premium Accounts'].map((n, i) => ({ name: n, value: data.orders.flatMap(o => o.items).filter(it => it.product.category === n).reduce((s, it) => s + it.quantity, 0) }))}
                    dataKey="value"
                    innerRadius={54}
                    outerRadius={78}
                    paddingAngle={3}>{['#74319f', '#b37bdc', '#e1b6f5'].map(c =>
                      <Cell key={c} fill={c} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="legend">{['Flowers', 'Keychains', 'Premium Accounts'].map((n, i) =>
              <div key={n}>
                <i style={{ background: ['#74319f', '#b37bdc', '#e1b6f5'][i] }} />{n}
              </div>)}
            </div>
          </section>
          <section className="card occasions">
            <h3>
              <CalendarDays size={20} /> Upcoming Special Events</h3>{upcoming.slice(0, 3).map(o =>
                <div className="occasion" key={o.name}>
                  <span>{o.emoji}
                  </span>
                  <div>
                    <b>{date(o.date)}
                    </b>
                    <strong>{o.name}
                    </strong>
                    <small>{o.note}
                    </small>
                  </div>
                </div>)}
          </section>
        </div>
        <div className="dashboard-row bottom-row">
          <section className="card">
            <div className="card-title">
              <h3>
                <CalendarDays size={20} /> Today's Schedule</h3>
              <span className="muted">{date(today)}
              </span>
            </div>{data.tasks.filter(t => t.scheduledAt && new Date(t.scheduledAt).toDateString() === today.toDateString()).length ? data.tasks.filter(t => t.scheduledAt && new Date(t.scheduledAt).toDateString() === today.toDateString()).map(t =>
              <div className="timeline-item" key={t.id}>
                <b>{new Date(t.scheduledAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
                </b>
                <span>{t.title}
                </span>
              </div>) :
              <p className="empty">No activities scheduled for today. Add one in My Planner.</p>}
          </section>
          <section className="card">
            <div className="card-title">
              <h3>
                <ClipboardList size={20} /> To-Do List</h3>{btn('Add Task', () => setModal('task'))}
            </div>{data.tasks.slice(0, 5).map(t =>
              <div className="todo-row" key={t.id}>
                <button onClick={() => saveTask(t, { completed: !t.completed })}>{t.completed ?
                  <CheckCircle2 className="checked" /> :
                  <Circle />}
                </button>
                <span className={t.completed ? 'done' : ''}>{t.title}
                </span>
                <button className="subtle-icon" onClick={() => mutate('/tasks/' + t.id, 'DELETE')}>
                  <Trash2 size={15} />
                </button>
              </div>)}
          </section>
          <section className="card">
            <h3>
              <ShieldCheck size={20} /> Warranty & Subscriptions</h3>{[["Active", active.length, 'good'], ['Expiring Soon (7 days)', expiring.length, 'warn'], ['Expired', expired.length, 'bad']].map(([n, v, c]) =>
                <button
                  type="button"
                  className={'status-line ' + c}
                  key={n}
                  onClick={() => showWarranties(c === 'good' ? 'active' : c === 'warn' ? 'expiring' : 'expired')}>
                  <span>{n}
                  </span>
                  <strong>{v}
                  </strong>
                  <ChevronRight size={17} />
                </button>)}
          </section>
        </div></>}
        {page === 'My Planner' &&
          <section className="card section-card">
            <div className="section-heading">
              <div>
                <h2>My Planner</h2>
                <p>Special occasions, daily schedules and your to-do list in one place.</p>
              </div>{btn(tab === 'Calendar' ? 'Add Event' : 'Add Task', () => openNew(tab === 'Calendar' ? 'event' : 'task'))}
            </div>
            <div className="tabs">{['Calendar', 'Schedule', 'To-Do'].map(t =>
              <button
                key={t}
                className={tab === t ? 'active' : ''}
                onClick={() => setTab(t)}>{t}
              </button>)}
            </div>{tab === 'Calendar' && <>
              <div className="calendar-toolbar">
                <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
                <h3>{month.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
              </div>
              <div className="calendar-grid">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d =>
                <b key={d}>{d}
                </b>)}{Array.from({ length: new Date(month.getFullYear(), month.getMonth(), 1).getDay() }, (_, i) =>
                  <div className="calendar-blank" key={'blank' + i} />)}{Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => {
                    const d = new Date(month.getFullYear(), month.getMonth(), i + 1);
                    const found = [...occasions.map(o => ({ ...o, date: occasionDate(o, d.getFullYear()) })), ...events.filter(e => eventMatchesDay(e, d)).map(e => ({ name: e.title, date: d, emoji: '📌', customEvent: e })), ...data.tasks.filter(t => t.scheduledAt).map(t => ({ name: t.title, date: new Date(t.scheduledAt), emoji: '📝' }))].filter(o => o.date.toDateString() === d.toDateString());
                    return <div className={'calendar-day ' + (found.length ? 'has-event ' : '') + (d.toDateString() === today.toDateString() ? 'today' : '')} key={i}>
                      <b>{i + 1}
                      </b>{found.map((o, j) => o.customEvent ?
                        <button
                          type="button"
                          className={'pastel-event pastel-' + (j % 5) + ' calendar-edit-event'}
                          title={'Edit ' + o.name}
                          key={j}
                          onClick={() => editRow('event', o.customEvent)}>{o.emoji} {o.name}
                        </button> :
                        <span
                          className={'pastel-event pastel-' + (j % 5)}
                          title={o.name}
                          key={j}>{o.emoji} {o.name}
                        </span>)}
                    </div>;
                  })}
              </div>
              <div className="event-management">
                <h3>My Added Events</h3>
                <p className="hint">Edit the title, starting date, or repeat schedule. Deleting a recurring event removes the whole series.</p>{events.length === 0 ?
                  <p className="empty">No custom events yet. Click Add Event to create one.</p> : [...events].sort((a, b) => String(a.date).localeCompare(String(b.date))).map(e =>
                    <div className="event-manage-row" key={e.id}>
                      <div className="event-manage-text">
                        <b>{e.title}
                        </b>
                        <small>{String(e.date).slice(0, 10)} · {({ none: 'One-time', week: 'Every week', month: 'Every month', year: 'Every year' })[e.repeat || 'none'] || 'One-time'}
                        </small>
                      </div>
                      <div className="event-manage-actions">
                        <button
                          type="button"
                          className="outline"
                          title={'Edit ' + e.title}
                          onClick={() => editRow('event', e)}>
                          <Pencil size={15} /> Edit</button>
                        <button
                          type="button"
                          className="outline event-delete"
                          title={'Delete ' + e.title}
                          disabled={busy}
                          onClick={() => deleteEvent(e)}>
                          <Trash2 size={15} /> Delete</button>
                      </div>
                    </div>)}
              </div>
              <h3>Special occasions to prepare for</h3>
              <div className="event-list">{upcoming.map(o =>
                <div className="occasion" key={o.name}>
                  <span>{o.emoji}
                  </span>
                  <div>
                    <strong>{o.name}
                    </strong>
                    <small>{date(o.date)} · {o.note}
                    </small>
                  </div>
                </div>)}
              </div></>}{tab === 'Schedule' && <>
                <h3>Scheduled Activities</h3>{data.tasks.filter(t => t.scheduledAt).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)).map(t =>
                  <div className="list-row" key={t.id}>
                    <div>
                      <b>{t.title}
                      </b>
                      <small>{date(t.scheduledAt)} · {new Date(t.scheduledAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
                      </small>
                    </div>
                    <button onClick={() => saveTask(t, { completed: !t.completed })}>{t.completed ? 'Completed' : 'Mark done'}
                    </button>
                  </div>)}{!data.tasks.some(t => t.scheduledAt) &&
                    <p className="empty">Schedule a task by adding a date and time.</p>}</>}{tab === 'To-Do' && <>{data.tasks.map(t =>
                      <div className="todo-row" key={t.id}>
                        <button onClick={() => saveTask(t, { completed: !t.completed })}>{t.completed ?
                          <CheckCircle2 className="checked" /> :
                          <Circle />}
                        </button>
                        <span className={t.completed ? 'done' : ''}>{t.title}{t.scheduledAt &&
                          <small>Scheduled: {date(t.scheduledAt)}
                          </small>}{t.notes &&
                            <small>📝 {t.notes}
                            </small>}{t.image &&
                              <a
                                href={t.image}
                                target="_blank"
                                rel="noreferrer">
                                <img
                                  className="task-thumb"
                                  src={t.image}
                                  alt="Task attachment" />
                              </a>}
                        </span>
                        <button
                          className="table-action"
                          title="Edit task"
                          onClick={() => editRow('task', t)}>
                          <Pencil size={16} />
                        </button>
                        <button className="subtle-icon" onClick={() => mutate('/tasks/' + t.id, 'DELETE')}>
                          <Trash2 size={16} />
                        </button>
                      </div>)}</>}
          </section>}
        {page === 'Inventory' &&
          <section className="card section-card">
            <div className="section-heading">
              <div>
                <h2>Inventory</h2>
                <p>Track your craft materials and remaining premium account slots separately from the selling Price List.</p>
              </div>
              <div className="inventory-actions">
                <button
                  type="button"
                  className="outline"
                  onClick={addInventoryCategory}
                  disabled={busy}>
                  <Plus size={15} /> Add Category</button>{inventoryTab === 'Materials' && btn('Add Material', () => openNew('material'))}
              </div>
            </div>

            <div className="inventory-tabs">
              <button
                type="button"
                className={inventoryTab === 'Materials' ? 'primary' : 'outline'}
                onClick={() => {
                  setInventoryTab('Materials');
                  setInventoryFilter('All');
                }}>Craft Materials</button>
              <button
                type="button"
                className={inventoryTab === 'Premium Accounts' ? 'primary' : 'outline'}
                onClick={() => {
                  setInventoryTab('Premium Accounts');
                  setInventoryFilter('All');
                }}>Premium Accounts</button>
            </div>

            <div className="inventory-category-filters">{['All', ...(inventoryTab === 'Materials' ? craftGroups : premiumGroups)].map(g =>
              <button
                type="button"
                key={g}
                className={inventoryFilter === g ? 'selected' : ''}
                onClick={() => setInventoryFilter(g)}>{g}
              </button>)}
            </div>{inventoryTab === 'Premium Accounts' && inventoryFilter !== 'All' &&
              <div className="inventory-category-management">
                <span>Selected:
                  <strong>{inventoryFilter}
                  </strong>
                </span>
                <button
                  type="button"
                  className="outline"
                  onClick={renameInventoryCategory}
                  disabled={busy}>
                  <Pencil size={15} /> Rename Category</button>
                <button
                  type="button"
                  className="outline danger-outline"
                  onClick={deleteInventoryCategory}
                  disabled={busy}>
                  <Trash2 size={15} /> Delete Category</button>
              </div>}

            <div className="search">
              <Search size={17} />
              <input
                placeholder={inventoryTab === 'Materials' ? 'Search materials...' : 'Search premium accounts...'}
                value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
            {inventoryTab === 'Materials' ?
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Material / Supplier Item</th>
                      <th>Supplier cost</th>
                      <th>Cost per piece</th>
                      <th>Quantity available</th>
                      <th>Units per pack</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>{filtered(data.materials.filter(p => (p.materialType || 'Craft Material') === 'Craft Material' && (inventoryFilter === 'All' || groupOf(p, 'craft') === inventoryFilter))).map(p =>
                    <tr key={p.id}>
                      <td>{p.image ?
                        <img
                          className="inventory-thumb"
                          src={p.image}
                          alt={p.name} /> :
                        <span className="inventory-no-image">
                          <ImagePlus size={19} />
                        </span>}
                      </td>
                      <td>
                        <b>{p.name}
                        </b>
                        <small>{groupOf(p, 'craft')} · {p.unit || 'pcs'}
                        </small>
                      </td>
                      <td>{money(p.cost)}
                      </td>
                      <td>{money(unitCost(p))}
                      </td>
                      <td>{p.stock}
                      </td>
                      <td>{p.packSize || 1}
                      </td>
                      <td>
                        <span className={'pill ' + (p.stock <= p.reorderAt ? 'red' : 'green')}>{p.stock <= p.reorderAt ? 'Low stock' : 'Available'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="table-action"
                          title="Edit"
                          onClick={() => editRow('material', p)}>
                          <Pencil size={16} />
                        </button>
                        <button
                          className="table-action"
                          title="Delete"
                          onClick={() => {
                            if (confirm('Delete this material?'))
                              mutate('/materials/' + p.id, 'DELETE');
                          }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>)}
                  </tbody>
                </table>
              </div> :
              <>
                <p className="hint">Each premium account product in your Price List appears here. Add new account products in Price List, then use Edit Stock to set their real quantity and supplier cost.</p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Account / service</th>
                        <th>Selling price</th>
                        <th>Supplier cost</th>
                        <th>Remaining stock</th>
                        <th>Low stock at</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>{filtered(data.products.filter(p => p.category === 'Premium Accounts' && (inventoryFilter === 'All' || groupOf(p, 'premium') === inventoryFilter))).map(p =>
                      <tr key={p.id}>
                        <td>{p.image ?
                          <img
                            className="inventory-thumb"
                            src={p.image}
                            alt={p.name} /> :
                          <span className="inventory-no-image">
                            <ImagePlus size={19} />
                          </span>}
                        </td>
                        <td>
                          <b>{p.name}
                          </b>
                          <small>{groupOf(p, 'premium')}
                          </small>
                        </td>
                        <td>{money(p.price)}
                        </td>
                        <td>{money(p.cost || 0)}
                        </td>
                        <td>
                          <strong>{p.stock ?? 0}
                          </strong>
                        </td>
                        <td>{p.reorderAt ?? 2}
                        </td>
                        <td>
                          <span className={'pill ' + (Number(p.stock || 0) <= Number(p.reorderAt ?? 2) ? 'red' : 'green')}>{Number(p.stock || 0) === 0 ? 'Out of stock' : Number(p.stock || 0) <= Number(p.reorderAt ?? 2) ? 'Low stock' : 'Available'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="outline"
                            type="button"
                            onClick={() => editRow('premium-stock', p)}>
                            <Pencil size={15} /> Edit Stock</button>
                        </td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>{!data.products.some(p => p.category === 'Premium Accounts') &&
                  <p className="hint">No Premium Accounts yet. Create one in Price List first.</p>}</>}

          </section>}
        {page === 'Price List' &&
          <section className="card section-card">
            <div className="section-heading">
              <div>
                <h2>Price List</h2>
                <p>Open a category to view its subcategories, then open a subcategory to see its products and warranty options.</p>
              </div>
              <div className="pricelist-actions">{btn('Add Product', () => openNew('product'))}
                <button
                  type="button"
                  className="outline"
                  onClick={addPriceSubcategory}>
                  <Plus size={15} /> Add Subcategory</button>
                <button className="outline" onClick={() => setShowPriceExport(v => !v)}>
                  <Printer size={16} /> Print / Export</button>
              </div>
            </div>
            {showPriceExport &&
              <div className="card pricelist-export">
                <h3>Export your price list</h3>
                <p className="hint">Four products per row, including photo, name and price, on both PDF and PNG.</p>
                <div className="export-checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={priceExportSelection.length === 3}
                      onChange={e => setPriceExportSelection(e.target.checked ? ['Flowers', 'Keychains', 'Premium Accounts'] : [])} /> All categories</label>{['Flowers', 'Keychains', 'Premium Accounts'].map(c =>
                        <label key={c}>
                          <input
                            type="checkbox"
                            checked={priceExportSelection.includes(c)}
                            onChange={e => setPriceExportSelection(v => e.target.checked ? [...v, c] : v.filter(x => x !== c))} />{c}
                        </label>)}
                </div>
                <div className="pricelist-actions">
                  <label className="field">
                    <span>Save format</span>
                    <select value={priceExportFormat} onChange={e => setPriceExportFormat(e.target.value)}>
                      <option value="pdf">PDF document</option>
                      <option value="png">PNG image</option>
                    </select>
                  </label>
                  <button
                    className="primary"
                    disabled={busy || !priceExportSelection.length}
                    onClick={async () => {
                      try {
                        setBusy(true);

                        await exportPriceList(data.products, priceExportSelection, priceExportFormat);

                        setError('');

                      }
                      catch (e) {
                        setError(e.message);

                      }
                      finally {
                        setBusy(false);

                      }
                    }}>
                    <Printer size={16} /> Save {priceExportFormat.toUpperCase()}
                  </button>
                </div>
              </div>}

            <div className="search">
              <Search size={17} />
              <input
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>{['Flowers', 'Keychains', 'Premium Accounts'].map(category => {
              const catProducts = filtered(data.products.filter(p => p.category === category && p.subcategory !== 'Materials'));
              const groups = [...new Set([...(data.pricelistSubcategories?.[category] || defaultPriceGroups[category]).filter(x => x !== 'Materials' && (category !== 'Premium Accounts' || x !== 'Others')), ...catProducts.map(p => category === 'Premium Accounts' && p.subcategory === 'Others' ? inferPriceSubcategory({ ...p, subcategory: '' }) : p.subcategory || inferPriceSubcategory(p))])];
              const open = search.trim() ? !false : !hiddenSubcategories['category:' + category];
              return <div className="price-category" key={category}>
                <button
                  type="button"
                  className="subcategory-toggle category-dropdown"
                  aria-expanded={open}
                  onClick={() => setHiddenSubcategories(v => ({ ...v, ['category:' + category]: !v['category:' + category] }))}>
                  <span>{category}
                    <small>({catProducts.length} products)</small>
                  </span>
                  <span>{open ? '▾' : '▸'}
                  </span>
                </button>{open &&
                  <div className="category-groups">{groups.map(subcategory => {
                    const products = catProducts.filter(p => (category === 'Premium Accounts' && p.subcategory === 'Others' ? inferPriceSubcategory({ ...p, subcategory: '' }) : p.subcategory || inferPriceSubcategory(p)) === subcategory);
                    const expanded = search.trim() ? true : !hiddenSubcategories[category + ':' + subcategory];
                    return <div className="price-subcategory" key={subcategory}>
                      <button
                        type="button"
                        className="subcategory-toggle"
                        aria-expanded={expanded}
                        onClick={() => setHiddenSubcategories(v => ({ ...v, [category + ':' + subcategory]: !v[category + ':' + subcategory] }))}>
                        <span>{subcategory}
                          <small>({products.length})</small>
                        </span>
                        <span>{expanded ? '▾' : '▸'}
                        </span>
                      </button>{expanded && (products.length ?
                        <div className="price-cards">{products.map(p =>
                          <article className="price-product card" key={p.id}>{p.image ?
                            <img
                              className="price-product-img"
                              src={p.image}
                              alt={p.name} /> :
                            <div className="price-product-placeholder">
                              <ImagePlus />
                            </div>}
                            <div className="price-product-info">
                              <strong>{p.name}
                              </strong>
                              <b>{money(p.price)}
                              </b>
                              <div>
                                <button
                                  className="table-action"
                                  title="Edit"
                                  onClick={() => editRow('product', p)}>
                                  <Pencil size={16} />
                                </button>
                                <button
                                  className="table-action"
                                  title="Delete"
                                  onClick={() => {
                                    if (confirm('Delete this product?'))
                                      mutate('/products/' + p.id, 'DELETE');
                                  }}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </article>)}
                        </div> :
                        <p className="hint">No products yet. Add an item and select this subcategory.</p>)}
                    </div>;
                  })}
                  </div>}
              </div>;
            })}
          </section>}
        {page === 'Orders' &&
          <section className="card section-card">
            <div className="section-heading">
              <div>
                <h2>Customer Orders</h2>
                <p>Track purchases, timestamps, payment status and products.</p>
              </div>{btn('New Order', () => openNew('order'))}
            </div>
            <div className="search">
              <Search size={17} />
              <input
                placeholder="Search orders..."
                value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Products</th>
                    <th>Purchased</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>{filtered(data.orders).map(o =>
                  <tr key={o.id}>
                    <td>
                      <b>#{String(o.id).padStart(4, '0')}
                      </b>
                      <small>OR {o.orNumber || '—'}
                      </small>
                    </td>
                    <td>{o.customer.name}
                    </td>
                    <td className="order-products-cell">
                      <div className="order-products-list">{o.items.map((i, index) =>
                        <div className="order-product-item" key={i.id ?? index}>{i.product?.name || 'Deleted product'}{Number(i.quantity) > 1 ? ` × ${i.quantity}` : ''}
                        </div>)}
                      </div>
                    </td>
                    <td>{date(o.purchaseDate || o.createdAt)}
                      <small>{new Date(o.createdAt).toLocaleTimeString('en-PH')}
                      </small>
                    </td>
                    <td>{money(o.total)}
                    </td>
                    <td>
                      <span className={'pill ' + (o.paymentStatus === 'Paid' ? 'green' : 'red')}>{o.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <span className="pill">{o.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="table-action"
                        onClick={() => editRow('order', o)}
                        title="Edit order">
                        <Pencil size={16} />
                      </button>
                      <button
                        className="table-action"
                        onClick={() => printOrderReceipt(o)}
                        title="Save receipt PNG">
                        <Printer size={16} />
                      </button>
                      <button
                        className="table-action order-delete-button"
                        onClick={() => deleteOrder(o)}
                        title="Delete order"
                        aria-label={"Delete order " + o.id}
                        disabled={busy}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </section>}
        {page === 'Subscriptions & Warranty' &&
          <section className="card section-card">
            <div className="section-heading">
              <div>
                <h2>Subscriptions & Warranty</h2>
                <p>Monitor clients, devices, payments and warranty expiry dates.</p>
              </div>{btn('Add Subscription', () => openNew('subscription'))}
            </div>
            <div className="warranty-filters">{[['all', 'All'], ['active', 'Active'], ['expiring', 'Expiring Soon'], ['expired', 'Expired']].map(([value, label]) =>
              <button
                type="button"
                key={value}
                className={warrantyFilter === value ? 'selected' : ''}
                onClick={() => setWarrantyFilter(value)}>{label} ({value === 'all' ? data.subs.length : value === 'expired' ? expired.length : value === 'expiring' ? expiring.length : active.length - expiring.length})</button>)}
            </div>
            <div className="search">
              <Search size={17} />
              <input
                placeholder="Search clients or services..."
                value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Device</th>
                    <th>Premium Account</th>
                    <th>Price</th>
                    <th>Purchased</th>
                    <th>Warranty</th>
                    <th>Warranty Expires</th>
                    <th>Paid?</th>
                  </tr>
                </thead>
                <tbody>{filtered(data.subs.filter(s => warrantyFilter === 'all' || warrantyStatus(s) === warrantyFilter)).map(s =>
                  <tr key={s.id}>
                    <td>
                      <b>{s.customer.name}
                      </b>
                    </td>
                    <td>{s.device}
                    </td>
                    <td>{s.service}
                    </td>
                    <td>{money(s.price)}
                    </td>
                    <td>{date(s.purchasedAt)}
                    </td>
                    <td>{s.warrantyDuration ?? s.warrantyDays} {s.warrantyUnit || 'days'}
                    </td>
                    <td>{date(s.warrantyExpiry)}
                      <small className={'warranty-label ' + warrantyStatus(s)}>{warrantyDaysRemaining(s.warrantyExpiry) < 0 ? 'Expired' : warrantyDaysRemaining(s.warrantyExpiry) === 0 ? 'Expires today' : warrantyDaysRemaining(s.warrantyExpiry) <= 7 ? 'Expiring Soon · ' + warrantyDaysRemaining(s.warrantyExpiry) + ' days left' : 'Active · ' + warrantyDaysRemaining(s.warrantyExpiry) + ' days left'}
                      </small>
                    </td>
                    <td>
                      <span className={'pill ' + (s.paid ? 'green' : 'red')}>{s.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </section>}
        {page === 'Price Calculator' &&
          <section className="section-card">
            <div className="section-heading">
              <div>
                <h2>Price Calculator & Official Receipt</h2>
                <p>Calculate your costs and profit separately from preparing your customer's receipt.</p>
              </div>
            </div>

            <div className="calculator-panels">

              <div className="card calc-panel">
                <h3>Price Calculator</h3>
                <p className="hint">Choose a business category to calculate profit or material costs.</p>
                <label className="field">
                  <span>Category</span>
                  <select value={calcCategory} onChange={e => setCalcCategory(e.target.value)}>
                    <option>Premium Accounts</option>
                    <option>Flowers</option>
                    <option>Keychains</option>
                  </select>
                </label>
                {calcCategory === 'Premium Accounts' ? <>
                  <label className="field">
                    <span>Supplier premium account / service</span>
                    <select value={calcProduct} onChange={e => {
                      setCalcProduct(e.target.value);
                      const p = data.materials.find(p => String(p.id) === e.target.value);
                      if (p)
                        setCalcCost(String(p.cost));
                    }}>
                      <option value="">Choose account (or enter amounts manually)</option>{data.materials.filter(p => p.materialType === 'Premium Account').map(p =>
                        <option key={p.id} value={p.id}>{p.name}
                        </option>)}
                    </select>
                  </label>
                  <div className="form-two">{[['Total account cost (₱)', calcCost, setCalcCost], ['Selling price per person (₱)', calcSelling, setCalcSelling], ['Number of customers / shares', calcCustomers, setCalcCustomers]].map(([label, v, set]) =>
                    <label className="field" key={label}>
                      <span>{label}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={v}
                        onChange={e => set(e.target.value)} />
                    </label>)}
                  </div>
                  <div className="calculation-result">
                    <div>
                      <span>Total revenue</span>
                      <strong>{money(premiumRevenue)}
                      </strong>
                    </div>
                    <div>
                      <span>Total cost</span>
                      <strong>{money(number(calcCost))}
                      </strong>
                    </div>
                    <div className="result-total">
                      <span>Expected profit</span>
                      <strong>{money(premiumProfit)}
                      </strong>
                    </div>
                  </div>
                  <p className="hint">Formula: (selling price per person × number of customers) − total account cost.</p></> :
                  <>
                    <p className="hint">Choose materials saved in Inventory. Their cost is calculated per inventory unit, so set each material's Supplier Cost (or Cost per Piece) and Units per purchase pack in Inventory (e.g., 100 fuzzy wires cost ₱45).</p>{flowerMaterials.map((m, index) => {
                      const product = data.materials.find(p => p.id === Number(m.productId));
                      return <div className="material-row" key={m.key}>
                        <label className="field">
                          <span>Material #{index + 1}
                          </span>
                          <select value={m.productId} onChange={e => setFlowerMaterials(v => v.map(x => x.key === m.key ? { ...x, productId: e.target.value } : x))}>
                            <option value="">Select inventory material</option>{data.materials.filter(p => (p.materialType || 'Craft Material') === 'Craft Material').map(p =>
                              <option key={p.id} value={p.id}>{p.name} — {money(unitCost(p))} per {p.unit || 'piece'}
                              </option>)}
                          </select>
                        </label>
                        <label className="field">
                          <span>Quantity used</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={m.qty}
                            onChange={e => setFlowerMaterials(v => v.map(x => x.key === m.key ? { ...x, qty: e.target.value } : x))} />
                        </label>
                        <div className="calc-material-cost">
                          <small>{product ? `${money(unitCost(product))} per ${product.unit || 'piece'}` : 'Select a material'}
                          </small>
                          <strong>{money(number(m.qty) * unitCost(product))}
                          </strong>
                        </div>
                        <button
                          type="button"
                          className="table-action"
                          aria-label="Remove material"
                          onClick={() => setFlowerMaterials(v => v.filter(x => x.key !== m.key))}>
                          <Trash2 size={17} />
                        </button>
                      </div>;
                    })}
                    <button
                      type="button"
                      className="outline"
                      onClick={() => setFlowerMaterials(v => [...v, { key: Date.now() + Math.random(), productId: '', qty: 1 }])}>
                      <Plus size={15} /> Add inventory material</button>{calcCategory === 'Flowers' &&
                        <div className="calc-add-pricelist">
                          <button
                            type="button"
                            className="outline"
                            onClick={() => setPricelistMaterials(v => [...v, { key: Date.now() + Math.random(), productId: '', qty: 1 }])}>
                            <Plus size={15} /> Add Pricelist Material</button>
                        </div>}{calcCategory === 'Flowers' && pricelistMaterials.length > 0 &&
                          <div className="calc-pricelist-rows">{pricelistMaterials.map((m, index) => {
                            const product = data.products.find(p => p.id === Number(m.productId));
                            return <div className="material-row" key={m.key}>
                              <label className="field">
                                <span>Pricelist Material #{index + 1}
                                </span>
                                <select value={m.productId} onChange={e => setPricelistMaterials(v => v.map(x => x.key === m.key ? { ...x, productId: e.target.value } : x))}>
                                  <option value="">Select pricelist material</option>{data.products.filter(p => p.category === 'Flowers' && p.subcategory === 'Materials').map(p =>
                                    <option key={p.id} value={p.id}>{p.name} — {money(p.price)} per item</option>)}
                                </select>
                              </label>
                              <label className="field">
                                <span>Quantity</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={m.qty}
                                  onChange={e => setPricelistMaterials(v => v.map(x => x.key === m.key ? { ...x, qty: e.target.value } : x))} />
                              </label>
                              <div className="calc-material-cost">
                                <small>{product ? money(product.price) + ' each' : 'Choose item'}
                                </small>
                                <strong>{money(number(m.qty) * number(product?.price))}
                                </strong>
                              </div>
                              <button
                                type="button"
                                className="table-action"
                                title="Remove pricelist material"
                                onClick={() => setPricelistMaterials(v => v.filter(x => x.key !== m.key))}>
                                <Trash2 size={17} />
                              </button>
                            </div>;
                          })}
                          </div>}
                    <label className="field">
                      <span>Labor cost (₱)</span>
                      <input
                        type="number"
                        min="0"
                        value={labor}
                        onChange={e => setLabor(e.target.value)} />
                    </label>
                    <div className="calculation-result">
                      <div>
                        <span>Inventory material cost</span>
                        <strong>{money(materialTotal)}
                        </strong>
                      </div>{calcCategory === 'Flowers' &&
                        <div>
                          <span>Pricelist materials</span>
                          <strong>{money(pricelistMaterialTotal)}
                          </strong>
                        </div>}
                      <div>
                        <span>Labor</span>
                        <strong>{money(number(labor))}
                        </strong>
                      </div>
                      <div className="result-total">
                        <span>Total production cost</span>
                        <strong>{money(flowerTotal)}
                        </strong>
                      </div>
                    </div></>}

              </div>

              <div className="card calc-panel">
                <h3>Official Receipt</h3>
                <p className="hint">Choose an order to use its fixed OR number, or prepare a manual receipt.</p>
                <label className="field">
                  <span>Order / OR number</span>
                  <select value={chosenOrder} onChange={e => {
                    setChosenOrder(e.target.value);
                    setReceiptImage('');
                  }}>
                    <option value="">Manual receipt — new OR number assigned when generated</option>{data.orders.map(o =>
                      <option key={o.id} value={o.id}>OR {o.orNumber || 'Pending'} — {o.customer?.name} — {money(o.total)}
                      </option>)}
                  </select>
                </label>

                <label className="field">
                  <span>Receipt / purchase date</span>
                  <input
                    type="date"
                    value={selectedOrder ? (selectedOrder.purchaseDate || selectedOrder.createdAt).slice(0, 10) : receiptDate}
                    disabled={!!selectedOrder}
                    onChange={e => {
                      setReceiptDate(e.target.value);
                      setReceiptImage('');
                    }} />
                </label>

                <label className="field">
                  <span>Customer name</span>
                  <input
                    value={selectedOrder ? selectedOrder.customer?.name || '' : receiptCustomer.name}
                    disabled={!!selectedOrder}
                    onChange={e => {
                      setReceiptCustomer(v => ({ ...v, name: e.target.value }));
                      setReceiptImage('');
                    }} />
                </label>
                {!selectedOrder && <>
                  <label className="field">
                    <span>Customer address (optional)</span>
                    <input value={receiptCustomer.address} onChange={e => {
                      setReceiptCustomer(v => ({ ...v, address: e.target.value }));
                      setReceiptImage('');
                    }} />
                  </label>
                  <label className="field">
                    <span>Customer contact (optional)</span>
                    <input value={receiptCustomer.contact} onChange={e => {
                      setReceiptCustomer(v => ({ ...v, contact: e.target.value }));
                      setReceiptImage('');
                    }} />
                  </label></>}

                <h4>Items / Services</h4>{!selectedOrder && <>
                  <label className="field">
                    <span>Choose a product from Price List</span>
                    <select value="" onChange={e => {
                      const p = data.products.find(p => String(p.id) === e.target.value);
                      if (p && receipt.length < 4) {
                        setReceipt(v => [...v, { id: 'p-' + Date.now() + Math.random(), name: p.name, qty: 1, price: p.price }]);

                        setReceiptImage('');

                      }
                    }}>
                      <option value="">Select product to add</option>{data.products.filter(p => p.price > 0).map(p =>
                        <option key={p.id} value={p.id}>{p.name} — {money(p.price)}
                        </option>)}
                    </select>
                  </label>
                  <button
                    className="outline"
                    type="button"
                    onClick={addReceiptItem}>
                    <Plus size={15} /> Add custom item / service</button></>}

                <div className="receipt-item-table">
                  <div className="receipt-item-head">
                    <span>Description</span>
                    <span>Qty.</span>
                    <span>Unit price</span>
                    <span>Amount</span>
                  </div>{currentItems.map((item, index) =>
                    <div className="receipt-item-row" key={item.id || index}>
                      <input
                        aria-label="Item description"
                        disabled={!!selectedOrder}
                        value={item.name}
                        onChange={e => updateReceiptItem(item.id, 'name', e.target.value)} />
                      <input
                        aria-label="Quantity"
                        disabled={!!selectedOrder}
                        type="number"
                        min="1"
                        step="1"
                        value={item.qty}
                        onChange={e => updateReceiptItem(item.id, 'qty', e.target.value)} />
                      <input
                        aria-label="Unit price"
                        disabled={!!selectedOrder}
                        type="number"
                        min="0"
                        step="any"
                        value={item.price}
                        onChange={e => updateReceiptItem(item.id, 'price', e.target.value)} />
                      <span>{money(number(item.qty) * number(item.price))}{!selectedOrder &&
                        <button
                          type="button"
                          className="table-action"
                          aria-label="Remove line"
                          onClick={() => {
                            setReceipt(v => v.filter(x => x.id !== item.id));
                            setReceiptImage('');
                          }}>
                          <X size={13} />
                        </button>}
                      </span>
                    </div>)}
                </div>

                <div className="receipt-math">
                  <div>
                    <span>Subtotal</span>
                    <strong>{money(receiptSubtotal)}
                    </strong>
                  </div>
                  <label className="field">
                    <span>Discount (₱)</span>
                    <input
                      type="number"
                      min="0"
                      max={receiptSubtotal}
                      value={discount}
                      onChange={e => {
                        setDiscount(e.target.value);
                        setReceiptImage('');
                      }} />
                  </label>
                  <div className="result-total">
                    <span>Total amount</span>
                    <strong>{money(receiptTotal)}
                    </strong>
                  </div>
                </div>
                <p className="hint">Amount in words is automatically written onto the PNG receipt.</p>

                <label className="field">
                  <span>Payment method (required)</span>
                  <select value={paymentMethod} onChange={e => {
                    setPaymentMethod(e.target.value);
                    setReceiptImage('');
                  }}>
                    <option value="">Choose payment method</option>{['Cash', 'GCash', 'Bank Transfer', 'Others'].map(x =>
                      <option key={x}>{x}
                      </option>)}
                  </select>
                </label>{paymentMethod === 'Others' &&
                  <label className="field">
                    <span>Specify other method</span>
                    <input value={otherPayment} onChange={e => setOtherPayment(e.target.value)} />
                  </label>}

                <button
                  className="primary"
                  disabled={busy || !paymentMethod || !currentItems.length}
                  onClick={generateImage}>
                  <Printer size={16} /> Generate Receipt PNG</button>{receiptImage &&
                    <div className="receipt-export">
                      <button className="outline" onClick={() => downloadReceipt(receiptImage, receiptNumber)}>Download PNG — OR {receiptNumber}
                      </button>
                      <button className="outline" onClick={() => {
                        const w = window.open('', '_blank');
                        if (!w) {
                          setError('Allow pop-ups to print the receipt');

                          return;

                        }
                        w.document.write('<html><head><title>Receipt ' + receiptNumber + '</title><style>body{margin:0}img{display:block;width:100%;max-width:800px;margin:auto}@media print{@page{margin:0}}</style></head><body><img src="' + receiptImage + '" onload="window.print()"/></body></html>');
                        w.document.close();
                      }}>Print receipt image</button>
                    </div>}


              </div>
            </div>
          </section>}
        {page === 'Settings' &&
          <section className="card section-card">
            <h2>Settings</h2>
            <p>Personalize your studio and learn how to use the system.</p>
            <div className="setting-row">
              <div>
                <b>Appearance</b>
                <small>Switch between purple-white light mode and dark mode.</small>
              </div>
              <button className="primary" onClick={() => setDark(!dark)}>{dark ?
                <Sun size={17} /> :
                <Moon size={17} />} {dark ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
            <div className="setting-row">
              <div>
                <b>User Manual</b>
                <small>Quick instructions for each feature.</small>
              </div>
              <button className="outline" onClick={() => setManual(!manual)}>{manual ? 'Hide Manual' : 'View Manual'}
              </button>
            </div>{manual &&
              <div className="manual">{[['Dashboard', 'See sales, order counts, low stock, tasks, and warranty alerts.'], ['My Planner', 'Use Calendar for occasions and custom events; schedule tasks by setting a date and time; check off to-dos.'], ['Inventory', 'Add products or materials with cost, price, quantity, and reorder threshold.'], ['Price List', 'View selling prices linked to the same product records.'], ['Orders', 'Create a customer order and select a product; stock is deducted automatically.'], ['Price Calculator', 'Calculate premium share profit or material-based flower/keychain costs; create and print image receipts with automatic order OR numbers.'], ['Subscriptions & Warranty', 'Add clients and record their purchased premium service, device, purchase date, and warranty days.'], ['Settings', 'Change appearance and access this manual.']].map(([k, v]) =>
                <p key={k}>
                  <b>{k}:</b> {v}
                </p>)}
              </div>}
            <div className="setting-row">
              <div>
                <b>Data security</b>
                <small>Admin login is required. Change seeded credentials before deploying publicly.</small>
              </div>
              <ShieldCheck />
            </div>
          </section>}

      </main>
    </div>{modal &&
      <div className="modal-overlay" onMouseDown={e => {
        if (e.target === e.currentTarget)
          setModal('');
      }}>
        <div className="modal card" key={modal + '-' + (editing?.id || 'new')}>
          <div className="card-title">
            <h2>{(editing ? 'Edit ' : 'Add ') + ({ product: 'Product', material: 'Material', task: 'Task', event: 'Event', order: 'Order', subscription: 'Subscription' })[modal]}
            </h2>
            <button className="icon-button" onClick={() => setModal('')}>
              <X />
            </button>
          </div>
          <form onSubmit={formSubmit}>{modal === 'premium-stock' && <>
            <p className="hint">Update the real available stock for
              <b>{editing?.name}
              </b>. Orders deduct units automatically; deleting an order returns its units.</p>{field('Available slots / accounts', 'stock', 'number', { value: editing?.stock ?? 0 })}{field('Supplier cost per slot (₱)', 'cost', 'number', { value: editing?.cost ?? 0 })}{field('Low stock alert at', 'reorderAt', 'number', { value: editing?.reorderAt ?? 2 })}
            <label className="field">
              <span>Premium Account Category</span>
              <select name="inventoryGroup" defaultValue={groupOf(editing, 'premium')}>{premiumGroups.map(g =>
                <option key={g} value={g}>{g}
                </option>)}
              </select>
            </label>
            <label className="field">
              <span>Account Product Image (optional, max 1 MB)</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file)
                    return;
                  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1000000) {
                    setError('Choose PNG, JPG or WebP under 1 MB');

                    return;

                  }
                  const reader = new FileReader();
                  reader.onload = () => setProductImage(String(reader.result));
                  reader.readAsDataURL(file);
                }} />
            </label>{productImage &&
              <div className="inventory-image-preview">
                <img src={productImage} alt="Account preview" />
                <button
                  type="button"
                  className="outline"
                  onClick={() => setProductImage('')}>Remove Image</button>
              </div>}</>}{modal === 'material' && <>
                {field('Material Name', 'name', 'text', { value: editing?.name || '' })}
                <label className="field">
                  <span>Craft Material Category</span>
                  <select
                    name="inventoryGroup"
                    value={materialGroup}
                    onChange={e => setMaterialGroup(e.target.value)}>{craftGroups.map(g =>
                      <option key={g} value={g}>{g}
                      </option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Material Image (optional, max 1 MB)</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file)
                        return;
                      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1000000) {
                        setError('Choose PNG, JPG or WebP under 1 MB');

                        e.target.value = '';

                        return;

                      }
                      const reader = new FileReader();
                      reader.onload = () => setMaterialImage(String(reader.result));
                      reader.readAsDataURL(file);
                    }} />
                </label>{materialImage &&
                  <div className="inventory-image-preview">
                    <img src={materialImage} alt="Material preview" />
                    <button
                      type="button"
                      className="outline"
                      onClick={() => setMaterialImage('')}>Remove Image</button>
                  </div>}

                <label className="field">
                  <span>Material Type</span>
                  <select name="materialType" defaultValue={editing?.materialType || 'Craft Material'}>
                    <option value="Craft Material">Craft Material</option>
                    <option value="Premium Account">Premium Account</option>
                  </select>
                </label>

                <label className="field">
                  <span>Supplier Cost per Pack (₱)</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={materialSupplierCost}
                    onChange={e => setMaterialSupplierCost(e.target.value)} />
                </label>

                <label className="field">
                  <span>Cost per Piece (₱)</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="Enter cost per piece manually"
                    value={materialPieceCost}
                    onChange={e => setMaterialPieceCost(e.target.value)} />
                  <small className="hint">Enter your actual cost per piece independently. Changing this will NOT change the Supplier Cost per Pack.</small>
                </label>
                {field('Quantity', 'stock', 'number', { value: editing?.stock ?? 0 })}

                <label className="field">
                  <span>Unit</span>
                  <select name="unit" defaultValue={editing?.unit || 'pcs'}>
                    <option value="pcs">pcs</option>
                    <option value="pack">pack</option>
                    <option value="set">set</option>
                    <option value="roll">roll</option>
                    <option value="sheet">sheet</option>
                    <option value="meter">meter</option>
                    <option value="gram">gram</option>
                    <option value="bottle">bottle</option>
                    <option value="slot">slot</option>
                  </select>
                </label>

                <label className="field">
                  <span>Unit per Purchase Pack</span>
                  <input
                    name="packSize"
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={materialPackSize}
                    onChange={e => setMaterialPackSize(e.target.value)} />
                </label>
                {field('Low Stock Alert', 'reorderAt', 'number', { value: editing?.reorderAt ?? 5 })}

                <div className="material-cost-preview" aria-live="polite">
                  <span>Unit cost used in Price Calculator</span>
                  <strong>{materialPieceCost === '' ? 'Enter cost per piece' : money(previewUnitCost)}
                  </strong>
                  <small>The Price Calculator uses this entered cost per piece. Supplier cost per pack and units per purchase pack are saved separately.</small>
                </div>
              </>}{modal === 'product' && <>{field('Product name', 'name', 'text', { value: editing?.name || '' })}
                <label className="field">
                  <span>Category</span>
                  <select
                    name="category"
                    value={productCategory}
                    onChange={e => setProductCategory(e.target.value)}>{['Flowers', 'Keychains', 'Premium Accounts'].map(x =>
                      <option key={x}>{x}
                      </option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Subcategory / Account brand</span>
                  <select
                    name="subcategory"
                    key={productCategory + '-' + (editing?.id || 'new')}
                    defaultValue={editing?.category === productCategory ? (editing?.subcategory || inferPriceSubcategory(editing)) : (data.pricelistSubcategories?.[productCategory] || defaultPriceGroups[productCategory])[0]}>{(data.pricelistSubcategories?.[productCategory] || defaultPriceGroups[productCategory]).filter(x => x !== 'Materials').concat(editing?.subcategory && !((data.pricelistSubcategories?.[productCategory] || defaultPriceGroups[productCategory]).includes(editing.subcategory)) ? [editing.subcategory] : []).map(x =>
                      <option key={x}>{x}
                      </option>)}
                  </select>
                  <small className="hint">Use Add Subcategory in Price List to create another group (e.g., Canva), then add products for its different warranty plans.</small>
                </label>{field('Selling price (₱)', 'price', 'number', { value: editing?.price ?? 0 })}
                <label className="field">
                  <span>Product image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file)
                        return;
                      if (!file.type.startsWith('image/') || file.size > 1000000) {
                        setError('Choose a product image smaller than 1 MB');

                        return;

                      }
                      const reader = new FileReader();
                      reader.onload = () => setProductImage(reader.result);
                      reader.readAsDataURL(file);
                    }} />
                </label>{productImage &&
                  <div>
                    <img
                      className="task-thumb"
                      src={productImage}
                      alt="Product" />
                    <button
                      className="outline"
                      type="button"
                      onClick={() => setProductImage('')}>Remove image</button>
                  </div>}</>}
            {modal === 'task' && <>{field('Task title', 'title', 'text', { value: editing?.title || '' })}{field('Schedule (optional)', 'scheduledAt', 'datetime-local', { required: false, value: editing?.scheduledAt ? new Date(editing.scheduledAt).toISOString().slice(0, 16) : '' })}
              <label className="field">
                <span>Additional notes</span>
                <textarea
                  name="notes"
                  defaultValue={editing?.notes || ''}
                  rows={3} />
              </label>
              <label className="field">
                <span>Attach an image (max 1.8 MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadTaskImage} />
              </label>{taskImage &&
                <div>
                  <img
                    src={taskImage}
                    className="task-thumb"
                    alt="Uploaded attachment" />
                  <button
                    type="button"
                    className="outline"
                    onClick={() => setTaskImage('')}>Remove image</button>
                </div>}</>}{modal === 'event' && <>{field('Event title', 'title', 'text', { value: editing?.title || '' })}{field('Event date', 'date', 'date', { value: String(editing?.date || '').slice(0, 10) })}
                  <label className="field">
                    <span>Repeat</span>
                    <select name="repeat" defaultValue={editing?.repeat || 'none'}>
                      <option value="none">Does not repeat</option>
                      <option value="week">Every week</option>
                      <option value="month">Every month</option>
                      <option value="year">Every year</option>
                    </select>
                  </label>
                  <small className="hint">{editing ? 'Editing this event updates its entire repeating series.' : 'Recurring events appear automatically on future calendar dates.'}
                  </small></>}{modal === 'order' && <>{field('Customer name', 'customerName', 'text', { value: editing?.customer?.name || '' })}
                    <div className="order-item-heading">
                      <h4>Products for this customer</h4>
                      <small>Add as many products and quantities as needed in one order.</small>
                    </div>{orderItems.map((item, index) => {
                      const product = data.products.find(p => String(p.id) === String(item.productId));
                      return <div className="order-item-row" key={item.key}>
                        <label className="field">
                          <span>Product #{index + 1}
                          </span>
                          <select
                            value={item.productId}
                            required
                            onChange={e => setOrderItems(v => v.map(i => i.key === item.key ? { ...i, productId: e.target.value } : i))}>
                            <option value="">Select product</option>{['Flowers', 'Keychains', 'Premium Accounts'].map(c =>
                              <optgroup key={c} label={c}>{data.products.filter(p => p.price >= 0 && p.category === c && p.subcategory !== 'Materials').map(p =>
                                <option key={p.id} value={p.id}>{p.name} — {money(p.price)}
                                </option>)}
                              </optgroup>)}
                          </select>
                        </label>
                        <label className="field">
                          <span>Quantity</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={item.quantity}
                            onChange={e => setOrderItems(v => v.map(i => i.key === item.key ? { ...i, quantity: e.target.value } : i))} />
                        </label>
                        <span className="order-item-price">{money((Number(product?.price) || 0) * Number(item.quantity || 0))}
                        </span>
                        <button
                          type="button"
                          className="table-action"
                          aria-label="Remove product"
                          title="Remove product"
                          disabled={orderItems.length === 1}
                          onClick={() => setOrderItems(v => v.filter(i => i.key !== item.key))}>
                          <Trash2 size={17} />
                        </button>
                      </div>;
                    })}
                    <button
                      type="button"
                      className="outline"
                      onClick={() => setOrderItems(v => [...v, { key: Date.now() + Math.random(), productId: '', quantity: 1 }])}>
                      <Plus size={16} /> Add Another Product</button>
                    <div className="order-total">
                      <span>Order total</span>
                      <strong>{money(orderItems.reduce((sum, i) => sum + (Number(data.products.find(p => String(p.id) === String(i.productId))?.price) || 0) * (Number(i.quantity) || 0), 0))}
                      </strong>
                    </div>
                    <label className="field">
                      <span>Payment status</span>
                      <select name="paymentStatus" defaultValue={editing?.paymentStatus || 'Unpaid'}>
                        <option>Unpaid</option>
                        <option>Paid</option>
                        <option>Partial</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Order status</span>
                      <select name="status" defaultValue={editing?.status || 'Pending'}>{['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'].map(x =>
                        <option key={x}>{x}
                        </option>)}
                      </select>
                    </label>{field('Purchase date', 'purchaseDate', 'date', { value: (editing?.purchaseDate || editing?.createdAt || new Date().toISOString()).slice(0, 10) })}{orderItems.some(i => data.products.find(p => String(p.id) === String(i.productId))?.category === 'Premium Accounts') && <>{field('Warranty duration', 'warrantyDuration', 'number', { value: editing?.warrantyDuration ?? 30 })}
                      <label className="field">
                        <span>Warranty unit</span>
                        <select name="warrantyUnit" defaultValue={editing?.warrantyUnit || 'days'}>{['days', 'months', 'years'].map(x =>
                          <option key={x} value={x}>{x}
                          </option>)}
                        </select>
                      </label>{field('Device name', 'device', 'text', { value: editing?.device || '' })}
                      <small className="hint">Warranty applies to each premium-account product in this order, starting on the purchase date.</small></>}</>}
            {modal === 'subscription' && <>{customers.length === 0 &&
              <p className="hint">Create an order first to register a customer.</p>}
              <label className="field">
                <span>Client</span>
                <select name="customerId" required>{customers.map(c =>
                  <option value={c.id} key={c.id}>{c.name}
                  </option>)}
                </select>
              </label>{field('Device name', 'device')}{field('Premium account / service', 'service')}{field('Price (₱)', 'price', 'number', { value: 0 })}{field('Purchase date', 'purchasedAt', 'date', { value: new Date().toISOString().slice(0, 10) })}{field('Warranty duration (days)', 'warrantyDays', 'number', { value: 30 })}{field('Subscription expiry (optional)', 'subscriptionExpiry', 'date', { required: false })}
              <label className="field">
                <span>Payment</span>
                <select name="paid">
                  <option value="false">Unpaid</option>
                  <option value="true">Paid</option>
                </select>
              </label></>}
            <div className="modal-actions">
              <button
                type="button"
                className="outline"
                onClick={() => setModal('')}>Cancel</button>
              <button className="primary" disabled={busy}>Save</button>
            </div>
          </form>
        </div>
      </div>}
  </div>;
}
export default App;
