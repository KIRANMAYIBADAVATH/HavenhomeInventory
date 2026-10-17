import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { saveRemote } from '../lib/storage.js';
import { applyStock } from '../lib/units.js';
import { expiryStatus, iso } from '../lib/status.js';

const Ctx = createContext(null);
export const useInv = () => useContext(Ctx);
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const FIELD = { rooms: 'room', categories: 'category' };
const log = (d, e) => ({ ...d, activity: [{ id: uid(), at: now(), ...e }, ...d.activity].slice(0, 1000) });

// `initial` is this user's inventory, already loaded from Supabase by ProtectedRoute.
export function InventoryProvider({ userId, initial, children }) {
  const [data, setData] = useState(initial);
  const [toasts, setToasts] = useState([]);
  const [sync, setSync] = useState('saved'); // 'saved' | 'saving' | 'error'
  const ref = useRef(initial);
  const timer = useRef(null);
  const chain = useRef(Promise.resolve());
  const first = useRef(true);
  const dirty = useRef(false);

  // Saves are queued one after another so an older, slower save can never overwrite a newer one.
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
    const snapshot = ref.current;
    setSync('saving');
    chain.current = chain.current
      .then(() => saveRemote(userId, snapshot))
      .then(() => { if (ref.current === snapshot) { dirty.current = false; setSync('saved'); } })
      .catch(() => setSync('error'));
    return chain.current;
  }, [userId]);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    dirty.current = true;
    setSync('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  }, [data, flush]);

  // save pending changes when leaving (logout / route change) and warn before closing the tab
  useEffect(() => {
    const warn = (e) => { if (dirty.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      if (dirty.current) flush();
    };
  }, [flush]);

  // commit applies a change to the latest data synchronously, so rapid repeated clicks cannot double count
  const commit = (fn) => { const n = fn(ref.current); ref.current = n; setData(n); };

  const toast = useCallback((msg, type = 'ok') => {
    const id = uid();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const status = (i) => expiryStatus(i, data.settings.expiryDays);

  const addItem = (item) => {
    const t = now();
    const it = { ...item, id: uid(), createdAt: t, updatedAt: t };
    commit((d) => log({ ...d, items: [it, ...d.items] }, { type: 'create', itemId: it.id, itemName: it.name, result: it.quantity, unit: it.unit }));
  };

  const updateItem = (id, patch) => {
    const old = ref.current.items.find((i) => i.id === id);
    if (!old) return;
    commit((d) => log({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: now() } : i)) },
      { type: 'update', itemId: id, itemName: patch.name || old.name, prev: old.quantity, result: patch.quantity ?? old.quantity, unit: patch.unit || old.unit }));
  };

  const deleteItem = (id) => {
    const old = ref.current.items.find((i) => i.id === id);
    if (!old) return;
    commit((d) => log({
      ...d, items: d.items.filter((i) => i.id !== id),
      shopping: d.shopping.map((s) => (s.itemId === id ? { ...s, itemId: null } : s)),
    }, { type: 'delete', itemId: id, itemName: old.name, prev: old.quantity, unit: old.unit }));
  };

  const stock = (id, type, amount, unit, reason = '') => {
    const item = ref.current.items.find((i) => i.id === id);
    if (!item) return { error: 'Item not found' };
    if (type === 'adjust' && !reason.trim()) return { error: 'A reason is required for adjustments' };
    const r = applyStock(item, type, amount, unit);
    if (r.error) return r;
    commit((d) => log({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, quantity: r.q, updatedAt: now() } : i)) },
      { type, itemId: id, itemName: item.name, prev: item.quantity, change: r.change, result: r.q, unit: item.unit, reason: reason.trim() }));
    return { ok: true };
  };

  // rooms / categories
  const addNamed = (kind, name) => {
    const n = name.trim();
    if (!n) return { error: 'Name is required' };
    if (ref.current[kind].some((x) => x.toLowerCase() === n.toLowerCase())) return { error: 'That name already exists' };
    commit((d) => ({ ...d, [kind]: [...d[kind], n] }));
    return { ok: true };
  };
  const renameNamed = (kind, old, next) => {
    const n = next.trim();
    if (!n) return { error: 'Name is required' };
    if (ref.current[kind].some((x) => x !== old && x.toLowerCase() === n.toLowerCase())) return { error: 'That name already exists' };
    const f = FIELD[kind];
    commit((d) => ({ ...d, [kind]: d[kind].map((x) => (x === old ? n : x)), items: d.items.map((i) => (i[f] === old ? { ...i, [f]: n } : i)) }));
    return { ok: true };
  };
  const removeNamed = (kind, name, reassign) => {
    const f = FIELD[kind];
    const count = ref.current.items.filter((i) => i[f] === name).length;
    if (count > 0 && (!reassign || reassign === name)) return { error: 'Choose where to move its items first' };
    commit((d) => ({ ...d, [kind]: d[kind].filter((x) => x !== name), items: d.items.map((i) => (i[f] === name ? { ...i, [f]: reassign } : i)) }));
    return { ok: true };
  };

  // shopping
  const addShopping = (s) => {
    if (s.itemId && ref.current.shopping.some((x) => x.itemId === s.itemId && !x.stocked && !x.purchased)) return { error: 'Already on the shopping list' };
    commit((d) => ({ ...d, shopping: [{ id: uid(), purchased: false, stocked: false, ...s }, ...d.shopping] }));
    return { ok: true };
  };
  const updateShopping = (id, patch) => commit((d) => ({ ...d, shopping: d.shopping.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const removeShopping = (id) => commit((d) => ({ ...d, shopping: d.shopping.filter((s) => s.id !== id) }));
  const togglePurchased = (id) => commit((d) => ({ ...d, shopping: d.shopping.map((s) => (s.id === id && !s.stocked ? { ...s, purchased: !s.purchased } : s)) }));

  // explicit confirmation step: only here does stock change
  const confirmPurchase = (id) => {
    const s = ref.current.shopping.find((x) => x.id === id);
    if (!s || s.stocked) return { error: 'Already added to inventory' };
    const item = ref.current.items.find((i) => i.id === s.itemId);
    if (!item) return { error: 'Link this entry to an existing item first' };
    const r = applyStock(item, 'restock', s.quantity, s.unit);
    if (r.error) return r;
    commit((d) => log({
      ...d,
      items: d.items.map((i) => (i.id === item.id ? { ...i, quantity: r.q, updatedAt: now() } : i)),
      shopping: d.shopping.map((x) => (x.id === id ? { ...x, purchased: true, stocked: true } : x)),
    }, { type: 'purchase', itemId: item.id, itemName: item.name, prev: item.quantity, change: r.change, result: r.q, unit: item.unit, reason: 'Purchase confirmed' }));
    return { ok: true };
  };

  const setExpiryDays = (n) => commit((d) => ({ ...d, settings: { ...d.settings, expiryDays: Math.max(0, Number(n) || 0) } }));

  // demo data (flagged so it can be removed without touching real records)
  const loadDemo = () => commit((d) => {
    const t = now();
    const day = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return iso(x); };
    const mk = (o) => ({ id: uid(), createdAt: t, updatedAt: t, demo: true, consumable: true, minStock: 1, brand: '', location: '', purchaseDate: '', expiry: '', price: '', supplier: '', description: 'Demo item', ...o });
    const items = [
      mk({ name: 'Rice', category: 'Kitchen and Groceries', room: 'Kitchen', location: 'Pantry', quantity: 5, unit: 'kg', minStock: 2, expiry: day(180) }),
      mk({ name: 'Cooking Oil', category: 'Kitchen and Groceries', room: 'Kitchen', location: 'Kitchen Shelf', quantity: 2, unit: 'litres', minStock: 2, expiry: day(90) }),
      mk({ name: 'Eggs', category: 'Kitchen and Groceries', room: 'Kitchen', location: 'Refrigerator', quantity: 12, unit: 'pieces', minStock: 6, expiry: day(5) }),
      mk({ name: 'Laptop', category: 'Electronics', room: 'Study Room', quantity: 1, unit: 'pieces', consumable: false, minStock: 0 }),
      mk({ name: 'Detergent', category: 'Cleaning Supplies', room: 'Storage Room', quantity: 2, unit: 'packets', minStock: 2, expiry: day(-3) }),
    ];
    return { ...d, items: [...items, ...d.items], rooms: [...new Set([...d.rooms, ...items.map((i) => i.room)])] };
  });
  const removeDemo = () => commit((d) => {
    const ids = new Set(d.items.filter((i) => i.demo).map((i) => i.id));
    return { ...d, items: d.items.filter((i) => !i.demo), shopping: d.shopping.map((s) => (ids.has(s.itemId) ? { ...s, itemId: null } : s)) };
  });

  const value = { data, items: data.items, status, toast, toasts, sync, retrySave: flush, addItem, updateItem, deleteItem, stock, addNamed, renameNamed, removeNamed,
    addShopping, updateShopping, removeShopping, togglePurchased, confirmPurchase, setExpiryDays, loadDemo, removeDemo };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
