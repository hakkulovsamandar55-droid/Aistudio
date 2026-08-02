import { Link } from 'react-router-dom';

/**
 * Shared primitives. Every page composes from these so the app reads as one
 * product rather than a dozen separately styled screens.
 */

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

const BUTTON_VARIANTS = {
  primary:
    'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500',
  secondary: 'bg-white/8 text-zinc-100 ring-1 ring-white/12 hover:bg-white/12',
  ghost: 'text-zinc-300 hover:bg-white/8 hover:text-white',
  danger: 'bg-red-600/90 text-white hover:bg-red-600',
};

const BUTTON_SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
};

export function Button({
  as,
  to,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) {
  const classes = cx(
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200',
    'disabled:cursor-not-allowed disabled:opacity-45',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  const Component = as || 'button';
  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}

export function Card({ className, hover = false, children, ...props }) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-white/8 bg-[#101018]/80 backdrop-blur',
        hover && 'transition-all duration-200 hover:border-white/16 hover:bg-[#14141d]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Input({ label, hint, className, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-zinc-300">{label}</span>}
      <input
        className={cx(
          'w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-zinc-100',
          'placeholder:text-zinc-600 transition-colors',
          'focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/40',
          'disabled:opacity-50',
          className
        )}
        {...props}
      />
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export function Textarea({ label, className, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-zinc-300">{label}</span>}
      <textarea
        className={cx(
          'w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-zinc-100',
          'placeholder:text-zinc-600 transition-colors resize-none',
          'focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/40',
          'disabled:opacity-50',
          className
        )}
        {...props}
      />
    </label>
  );
}

const BADGE_TONES = {
  neutral: 'bg-white/8 text-zinc-300 ring-white/10',
  brand: 'bg-violet-500/15 text-violet-300 ring-violet-500/25',
  success: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/25',
  warning: 'bg-amber-500/15 text-amber-300 ring-amber-500/25',
  danger: 'bg-red-500/15 text-red-300 ring-red-500/25',
};

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1',
        BADGE_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-[3px]', lg: 'h-12 w-12 border-4' };
  return (
    <div
      className={cx(
        'animate-spin rounded-full border-violet-500/25 border-t-violet-400',
        sizes[size],
        className
      )}
    />
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-zinc-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon = '✨', title, description, action }) {
  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <span className="text-4xl">{icon}</span>
      <h3 className="mt-4 font-medium text-zinc-200">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-zinc-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}

export function Skeleton({ className }) {
  return <div className={cx('shimmer rounded-xl bg-white/5', className)} />;
}

const STATUS_TONES = {
  PENDING: 'warning',
  PLANNING: 'warning',
  PROCESSING: 'brand',
  RUNNING: 'brand',
  COMPLETED: 'success',
  PARTIAL: 'warning',
  FAILED: 'danger',
};

const STATUS_LABELS = {
  PENDING: 'Navbatda',
  PLANNING: 'Rejalashtirilmoqda',
  PROCESSING: 'Jarayonda',
  RUNNING: 'Bajarilmoqda',
  COMPLETED: 'Tayyor',
  PARTIAL: 'Qisman',
  FAILED: 'Xato',
};

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONES[status] || 'neutral'}>{STATUS_LABELS[status] || status}</Badge>;
}

export { cx, STATUS_LABELS };
