import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cx } from './ui';

const NAV_ITEMS = [
  { to: '/magic', label: 'Magic', icon: '✨' },
  { to: '/dashboard', label: 'Bosh sahifa', icon: '◈' },
  { to: '/projects', label: 'Loyihalar', icon: '❖' },
  { to: '/history', label: 'Tarix', icon: '◷' },
  { to: '/gallery', label: 'Galereya', icon: '◉' },
];

export default function Layout({ children, wide = false }) {
  const { user, credits, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (to) => pathname === to || pathname.startsWith(`${to}/`);

  return (
    <div className="min-h-screen bg-[#08080c]">
      <header className="sticky top-0 z-20 border-b border-white/6 bg-[#08080c]/85 backdrop-blur-xl">
        <div className={cx('mx-auto flex items-center justify-between gap-4 px-5 py-3', wide ? 'max-w-7xl' : 'max-w-6xl')}>
          <div className="flex items-center gap-7">
            <Link to="/dashboard" className="text-lg font-semibold tracking-tight text-white">
              AI Studio
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cx(
                    'rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive(item.to)
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:bg-white/6 hover:text-white'
                  )}
                >
                  {item.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/admin"
                  className={cx(
                    'rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive('/admin')
                      ? 'bg-violet-500/20 text-violet-200'
                      : 'text-violet-400 hover:bg-violet-500/10'
                  )}
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/billing"
              className="rounded-full bg-violet-500/15 px-3 py-1.5 text-sm font-medium text-violet-200 ring-1 ring-violet-500/25 transition-colors hover:bg-violet-500/25"
            >
              ◆ {credits}
            </Link>
            <Link
              to="/settings"
              className="hidden rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:text-white sm:block"
            >
              {user?.name}
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:text-white"
            >
              Chiqish
            </button>
          </div>
        </div>
      </header>

      <main className={cx('mx-auto px-5 py-8 pb-24 md:pb-8', wide ? 'max-w-7xl' : 'max-w-6xl')}>
        {children}
      </main>

      {/* Mobile tab bar — the app is designed to become an APK later. */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-white/8 bg-[#0b0b11]/95 px-2 py-2 backdrop-blur-xl md:hidden">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cx(
              'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] transition-colors',
              isActive(item.to) ? 'text-violet-300' : 'text-zinc-500'
            )}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
        <Link
          to="/settings"
          className={cx(
            'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] transition-colors',
            isActive('/settings') ? 'text-violet-300' : 'text-zinc-500'
          )}
        >
          <span className="text-base">⚙</span>
          Sozlama
        </Link>
      </nav>
    </div>
  );
}
