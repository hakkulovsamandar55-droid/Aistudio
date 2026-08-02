import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/** A no-op wrapper when Google sign-in isn't configured, so the app never
 * depends on having a client id to boot. */
function GoogleProvider({ children }) {
  return GOOGLE_CLIENT_ID ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>
  ) : (
    children
  );
}

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Create from './pages/Create';
import Library from './pages/Library';
import Profile from './pages/Profile';
import Magic from './pages/Magic';
import Remix from './pages/Remix';
import GenerateImage from './pages/GenerateImage';
import GenerateVideo from './pages/GenerateVideo';
import ProjectDetail from './pages/ProjectDetail';
import Billing from './pages/Billing';
import BillingSuccess from './pages/BillingSuccess';
import BillingCancel from './pages/BillingCancel';
import Settings from './pages/Settings';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminGenerations from './pages/admin/AdminGenerations';
import AdminPackages from './pages/admin/AdminPackages';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import AdminProviders from './pages/admin/AdminProviders';
import AdminEconomics from './pages/admin/AdminEconomics';

/**
 * Four tabs carry the whole app: Bosh, Yaratish, Ishlarim, Profil. Everything
 * else is a sub-page opened from one of them, which is why the generators and
 * settings are listed here but never appear in the tab bar.
 */
const protectedRoutes = [
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/create', element: <Create /> },
  { path: '/library', element: <Library /> },
  { path: '/profile', element: <Profile /> },

  { path: '/magic', element: <Magic /> },
  { path: '/remix', element: <Remix /> },
  { path: '/generate/image', element: <GenerateImage /> },
  { path: '/generate/video', element: <GenerateVideo /> },
  { path: '/projects/:id', element: <ProjectDetail /> },
  { path: '/billing', element: <Billing /> },
  { path: '/settings', element: <Settings /> },
];

/** Old top-level destinations now live inside the Ishlarim tab. */
const redirects = [
  { from: '/projects', to: '/library' },
  { from: '/history', to: '/library?view=history' },
  { from: '/gallery', to: '/library?view=gallery' },
];

const adminRoutes = [
  { path: '/admin', element: <AdminDashboard /> },
  { path: '/admin/users', element: <AdminUsers /> },
  { path: '/admin/generations', element: <AdminGenerations /> },
  { path: '/admin/packages', element: <AdminPackages /> },
  { path: '/admin/announcements', element: <AdminAnnouncements /> },
  { path: '/admin/providers', element: <AdminProviders /> },
  { path: '/admin/economics', element: <AdminEconomics /> },
];

function App() {
  return (
    <BrowserRouter>
      <GoogleProvider>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/billing/success" element={<BillingSuccess />} />
              <Route path="/billing/cancel" element={<BillingCancel />} />

              {redirects.map(({ from, to }) => (
                <Route key={from} path={from} element={<Navigate to={to} replace />} />
              ))}

              {protectedRoutes.map(({ path, element }) => (
                <Route key={path} path={path} element={<ProtectedRoute>{element}</ProtectedRoute>} />
              ))}

              {adminRoutes.map(({ path, element }) => (
                <Route key={path} path={path} element={<AdminRoute>{element}</AdminRoute>} />
              ))}
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </GoogleProvider>
    </BrowserRouter>
  );
}

export default App;
