import { useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../store/AuthContext.jsx';
import { InventoryProvider } from '../store/InventoryContext.jsx';
import { loadRemote } from '../lib/storage.js';

function DataGate({ user }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });

  const fetchData = useCallback(() => {
    setState({ status: 'loading', data: null, error: '' });
    loadRemote(user.id)
      .then((data) => setState({ status: 'ready', data, error: '' }))
      .catch((e) => setState({ status: 'error', data: null, error: e.message }));
  }, [user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (state.status === 'loading') return <div className="splash"><Loader2 className="spin" size={20} /> Loading your inventory…</div>;
  if (state.status === 'error') {
    return (
      <div className="splash col">
        <p>Could not load your inventory: {state.error}</p>
        <p className="muted">Check that you ran supabase/schema.sql in your Supabase project.</p>
        <button className="btn primary" onClick={fetchData}>Try again</button>
      </div>
    );
  }
  return <InventoryProvider userId={user.id} initial={state.data}><Outlet /></InventoryProvider>;
}

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) return <div className="splash"><Loader2 className="spin" size={20} /> Loading Haven…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  // key = user.id remounts everything on account switch, so one user's data never leaks into another's
  return <DataGate key={user.id} user={user} />;
}
