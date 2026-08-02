import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from './icons';
import { cx } from './ui';

const NAV_ITEMS = [
  { to: '/admin', label: 'Statistika', icon: 'chart' },
  { to: '/admin/users', label: 'Foydalanuvchilar', icon: 'users' },
  { to: '/admin/generations', label: 'Generatsiyalar', icon: 'layers' },
  { to: '/admin/providers', label: 'API kalitlar', icon: 'key' },
  { to: '/admin/economics', label: 'Iqtisodiyot', icon: 'target' },
  { to: '/admin/packages', label: 'Kredit paketlari', icon: 'package' },
  { to: '/admin/announcements', label: "E'lonlar", icon: 'megaphone' },
];

export default function AdminLayout({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-[#faf7f1]">
      <header className="sticky top-0 z-10 border-b border-[#e8e0d3] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/admin" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#37322b] text-white">
              <Icon name="shield" size="sm" />
            </span>
            <span className="font-semibold tracking-tight text-[#1c1a17]">
              AI Studio <span className="text-[#5b45e0]">Admin</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-[#a1978a] sm:inline">{user?.name}</span>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[#6d655a] transition-colors hover:bg-[#f0eae0] hover:text-[#1c1a17]"
            >
              <Icon name="arrowLeft" size="sm" />
              <span className="hidden sm:inline">Ilovaga</span>
            </Link>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-[#f0eae0] px-4 py-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cx(
                  'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-[#efecff] text-[#4733c4]'
                    : 'text-[#6d655a] hover:bg-[#f0eae0] hover:text-[#1c1a17]'
                )}
              >
                <Icon name={item.icon} size="sm" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-7">{children}</main>
    </div>
  );
}
