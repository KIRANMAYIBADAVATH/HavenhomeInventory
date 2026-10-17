import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './store/AuthContext.jsx';
import { supabaseConfigured } from './lib/supabase.js';
import './index.css';

createRoot(document.getElementById('root')).render(
  supabaseConfigured ? (
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  ) : (
    <div className="splash col">
      <h2>Haven is not configured yet</h2>
      <p className="muted">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see README), then restart.</p>
    </div>
  )
);
