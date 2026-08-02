import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Gallery from './pages/Gallery';
import Dashboard from './pages/Dashboard';
import GenerateImage from './pages/GenerateImage';
import GenerateVideo from './pages/GenerateVideo';
import Billing from './pages/Billing';
import BillingSuccess from './pages/BillingSuccess';
import BillingCancel from './pages/BillingCancel';
import History from './pages/History';
import Settings from './pages/Settings';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminGenerations from './pages/admin/AdminGenerations';
import AdminPackages from './pages/admin/AdminPackages';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';

const protectedRoutes = [
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/generate/image', element: <GenerateImage /> },
  { path: '/generate/video', element: <GenerateVideo /> },
  { path: '/billing', element: <Billing /> },
  { path: '/history', element: <History /> },
  { path: '/settings', element: <Settings /> },
];

const adminRoutes = [
  { path: '/admin', element: <AdminDashboard /> },
  { path: '/admin/users', element: <AdminUsers /> },
  { path: '/admin/generations', element: <AdminGenerations /> },
  { path: '/admin/packages', element: <AdminPackages /> },
  { path: '/admin/announcements', element: <AdminAnnouncements /> },
];

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/billing/success" element={<BillingSuccess />} />
            <Route path="/billing/cancel" element={<BillingCancel />} />

            {protectedRoutes.map(({ path, element }) => (
              <Route key={path} path={path} element={<ProtectedRoute>{element}</ProtectedRoute>} />
            ))}

            {adminRoutes.map(({ path, element }) => (
              <Route key={path} path={path} element={<AdminRoute>{element}</AdminRoute>} />
            ))}
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
