import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from './icons';
import { cx } from './ui';

/**
 * The app shell.
 *
 * Navigation is four bottom tabs — the whole product lives inside them, and
 * anything deeper (a generator, a project, settings) opens as a sub-page with
 * a back arrow rather than another top-level destination. That keeps the tab
 * bar honest and matches how this will behave once it is wrapped as an APK.
 */

const TABS = [
  { to: '/dashboard', label: 'Bosh', icon: 'home' },
  { to: '/create', label: 'Yaratish', icon: 'create' },
  { to: '/library', label: 'Ishlarim', icon: 'library' },
  { to: '/profile', label: 'Profil', icon: 'profile' },
];

/** Sub-pages map onto the tab they belong to, so the right tab stays lit. */
const TAB_FOR_PREFIX = [
  ['/magic', '/create'],
  ['/generate', '/create'],
  ['/remix', '/create'],
  ['/projects', '/library'],
  ['/history', '/library'],
  ['/gallery', '/library'],
  ['/settings', '/profile'],
  ['/billing', '/profile'],
];

function activeTab(pathname) {
  const mapped = TAB_FOR_PREFIX.find(([prefix]) => pathname.startsWith(prefix));
  if (mapped) return mapped[1];

  const tab = TABS.find(({ to }) => pathname === to || pathname.startsWith(`${to}/`));
  return tab ? tab.to : null;
}

/**
 * @param {{ title?: string, back?: string, action?: React.ReactNode, wide?: boolean }} props
 *   `back` turns the header into a sub-page header with a back arrow.
 */
export default function Layout({ children, title, back, action, wide = false }) {
  const { user, credits } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const current = activeTab(pathname);
  const width = wide ? 'max-w-6xl' : 'max-w-3xl';

  return (
    <div className="min-h-screen bg-[#faf7f1]">
      <header className="sticky top-0 z-20 border-b border-[#e8e0d3] bg-[#faf7f1]/90 backdrop-blur-xl">
        <div className={cx('mx-auto flex h-14 items-center gap-3 px-4', width)}>
          {back ? (
            <>
              <button
                onClick={() => navigate(back)}
                aria-label="Orqaga"
                className="-ml-2 rounded-lg p-2 text-[#6d655a] transition-colors hover:bg-[#f0eae0] hover:text-[#1c1a17]"
              >
                <Icon name="chevronLeft" size="md" />
              </button>
              <h1 className="min-w-0 flex-1 truncate font-semibold text-[#1c1a17]">{title}</h1>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#5b45e0] text-white">
                  <Icon name="sparkle" size="sm" />
                </span>
                <span className="font-semibold tracking-tight text-[#1c1a17]">AI Studio</span>
              </Link>
              <div className="flex-1" />
            </>
          )}

          {action}

          <Link
            to="/billing"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#efecff] px-3 py-1.5 text-sm font-semibold text-[#4733c4] transition-colors hover:bg-[#e4dfff]"
          >
            <Icon name="credit" size="sm" />
            {credits}
          </Link>

          {user?.role === 'ADMIN' && !back && (
            <Link
              to="/admin"
              aria-label="Admin panel"
              className="rounded-lg p-2 text-[#6d655a] transition-colors hover:bg-[#f0eae0] hover:text-[#1c1a17]"
            >
              <Icon name="shield" size="md" />
            </Link>
          )}
        </div>
      </header>

      <main className={cx('mx-auto px-4 pb-28 pt-6', width)}>{children}</main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-[#e8e0d3] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md">
          {TABS.map((tab) => {
            const isActive = current === tab.to;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cx(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-[#5b45e0]' : 'text-[#a1978a] hover:text-[#6d655a]'
                )}
              >
                <Icon name={tab.icon} size="md" strokeWidth={isActive ? 1.9 : 1.6} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
