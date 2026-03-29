import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import SecretaryDashboard from './pages/SecretaryDashboard';
import TechnicianDashboard from './pages/TechnicianDashboard';

const DASHBOARDS = {
  admin:      <AdminDashboard />,
  secretary:  <SecretaryDashboard />,
  technician: <TechnicianDashboard />,
};

function AppRoutes() {
  const { user } = useAuth();
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;
  return <Routes><Route path="*" element={DASHBOARDS[user.role] || <Login />} /></Routes>;
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
