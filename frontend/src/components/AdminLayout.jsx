import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/admin', label: 'Statistika' },
  { to: '/admin/users', label: "Foydalanuvchilar" },
  { to: '/admin/generations', label: 'Generatsiyalar' },
  { to: '/admin/packages', label: 'Kredit paketlari' },
  { to: '/admin/announcements', label: "E'lonlar" },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link to="/admin" className="text-lg font-bold text-white">
              AI Studio <span className="text-indigo-400">Admin</span>
            </Link>
            <nav className="hidden gap-1 sm:flex">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm text-gray-400 hover:text-gray-200">
              ← Foydalanuvchi paneliga
            </Link>
            <span className="hidden text-sm text-gray-400 sm:inline">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800"
            >
              Chiqish
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-gray-800 px-4 py-2 sm:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
