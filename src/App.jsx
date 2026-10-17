import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Auth from './pages/Auth.jsx';
import Overview from './pages/Overview.jsx';
import Items from './pages/Items.jsx';
import Rooms from './pages/Rooms.jsx';
import Expiry from './pages/Expiry.jsx';
import Shopping from './pages/Shopping.jsx';
import Activity from './pages/Activity.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/register" element={<Auth mode="register" />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="items" element={<Items />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="low-stock" element={<Items fixed={{ low: '1' }} />} />
          <Route path="expiry" element={<Expiry />} />
          <Route path="shopping" element={<Shopping />} />
          <Route path="activity" element={<Activity />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
