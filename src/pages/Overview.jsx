import { Link } from 'react-router-dom';
import { useInv } from '../store/InventoryContext.jsx';
import { isLow } from '../lib/status.js';

export default function Overview() {
  const { data, items, status, loadDemo, removeDemo } = useInv();
  const low = items.filter(isLow);
  const soon = items.filter((i) => status(i) === 'expiring_soon');
  const expired = items.filter((i) => status(i) === 'expired');
  const pending = data.shopping.filter((s) => !s.purchased).length;
  const recent = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const stats = [['Inventory records', items.length, '/items'], ['Rooms', data.rooms.length, '/rooms'], ['Categories', data.categories.length, '/rooms'],
    ['Low stock', low.length, '/low-stock'], ['Expiring soon', soon.length, '/expiry'], ['Expired', expired.length, '/expiry'], ['To buy', pending, '/shopping']];

  return (
    <>
      <div className="stats">{stats.map(([l, v, to]) => <Link key={l} to={to} className="card stat"><b>{v}</b><span>{l}</span></Link>)}</div>

      {items.length === 0 && (
        <div className="card empty">Your inventory is empty. Add an item, or <button className="btn ghost sm" onClick={loadDemo}>load labelled demo data</button></div>
      )}
      {items.some((i) => i.demo) && <p className="note">Demo data is loaded. <button className="btn ghost sm" onClick={removeDemo}>Remove demo data only</button></p>}

      <h2>Explore by Room</h2>
      <div className="grid">
        {data.rooms.map((r) => (
          <Link key={r} to={`/items?room=${encodeURIComponent(r)}`} className="card room">
            <b>{r}</b><span>{items.filter((i) => i.room === r).length} items</span>
          </Link>
        ))}
      </div>

      <div className="two">
        <section className="card"><h3>Needs attention</h3>
          {low.length + soon.length + expired.length === 0 && <p className="muted">Nothing needs attention.</p>}
          {low.slice(0, 5).map((i) => <p key={'l' + i.id}>⚠️ {i.name}: {i.quantity} {i.unit} (min {i.minStock})</p>)}
          {expired.slice(0, 5).map((i) => <p key={'e' + i.id}>⛔ {i.name} expired {i.expiry}</p>)}
          {soon.slice(0, 5).map((i) => <p key={'s' + i.id}>⏳ {i.name} expires {i.expiry}</p>)}
        </section>
        <section className="card"><h3>Quick actions</h3>
          <div className="actions-col">
            <Link className="btn ghost" to="/items">Browse all items</Link>
            <Link className="btn ghost" to="/shopping">Open shopping list</Link>
            <Link className="btn ghost" to="/rooms">Manage rooms & categories</Link>
            <Link className="btn ghost" to="/activity">View activity</Link>
          </div>
        </section>
        <section className="card"><h3>Recently added</h3>
          {recent.length === 0 ? <p className="muted">No items yet.</p> : recent.map((i) => <p key={i.id}>{i.name} <small>· {i.room}</small></p>)}
        </section>
        <section className="card"><h3>Recent activity</h3>
          {data.activity.length === 0 ? <p className="muted">No activity yet.</p> : data.activity.slice(0, 6).map((a) => (
            <p key={a.id}><b>{a.type}</b> {a.itemName} <small>· {new Date(a.at).toLocaleString()}</small></p>
          ))}
        </section>
      </div>
    </>
  );
}
