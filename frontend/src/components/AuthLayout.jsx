import { Link } from 'react-router-dom';
import { Icon } from './icons';

/** Shared frame for the signed-out screens, so they all open the same way. */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf7f1] px-4 py-10">
      <Link to="/" className="mb-7 flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#5b45e0] text-white">
          <Icon name="sparkle" size="md" />
        </span>
        <span className="text-lg font-semibold tracking-tight text-[#1c1a17]">AI Studio</span>
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-[#e8e0d3] bg-white p-7">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-[#1c1a17]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-[#6d655a]">{subtitle}</p>}
        </div>
        {children}
      </div>

      {footer && <div className="mt-5 text-center text-sm text-[#6d655a]">{footer}</div>}
    </div>
  );
}
