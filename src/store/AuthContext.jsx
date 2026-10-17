import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

const toUser = (u) => u && ({ id: u.id, email: u.email, name: u.user_metadata?.full_name || u.email.split('@')[0] });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(toUser(data.session?.user));
      setLoading(false);
    }).catch(() => alive && setLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setUser(toUser(session?.user)));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(/invalid login/i.test(error.message) ? 'Incorrect email or password' : error.message);
  };

  // returns { needsConfirm: true } when Supabase requires email confirmation before first login
  const register = async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    if (error) throw new Error(error.message);
    if (data.user && data.user.identities && data.user.identities.length === 0) throw new Error('An account with this email already exists');
    return { needsConfirm: !data.session };
  };

  const logout = async () => { await supabase.auth.signOut(); setUser(null); };

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
