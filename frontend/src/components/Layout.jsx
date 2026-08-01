import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/history', label: 'Tarix', icon: '🕘' },
  { to: '/billing', label: 'Kredit sotib olish', icon: '💳' },
];

export default function Layout({ children }) {
  const { user, credits, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="text-lg font-bold text-gray-900">
            AI Studio
          </Link>

          <nav className="hidden gap-1 sm:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                {item.icon} {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className="rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
              >
                🛠️ Admin panel
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
              💎 {credits} kredit
            </span>
            <span className="hidden text-sm text-gray-500 sm:inline">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
            >
              Chiqish
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-gray-200 bg-white py-2 sm:hidden">
        {NAV_ITEMS.map((item) => (
          <Link key={item.to} to={item.to} className="flex flex-col items-center text-xs text-gray-600">
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}
        <button onClick={handleLogout} className="flex flex-col items-center text-xs text-gray-600">
          <span className="text-lg">🚪</span>
          Chiqish
        </button>
      </nav>
    </div>
  );
}
