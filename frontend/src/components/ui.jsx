import { Link } from 'react-router-dom';
import { Icon } from './icons';

/**
 * Shared primitives. Every page composes from these so the app reads as one
 * product rather than a dozen separately styled screens.
 */

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

const BUTTON_VARIANTS = {
  primary: 'bg-[#5b45e0] text-white shadow-sm shadow-[#5b45e0]/25 hover:bg-[#4733c4] active:bg-[#3f2cb0]',
  secondary:
    'bg-white text-[#37322b] ring-1 ring-[#e8e0d3] hover:bg-[#faf7f1] hover:ring-[#d8cdba] active:bg-[#f4efe6]',
  soft: 'bg-[#efecff] text-[#4733c4] hover:bg-[#e4dfff] active:bg-[#d9d3ff]',
  ghost: 'text-[#6d655a] hover:bg-[#f0eae0] hover:text-[#1c1a17]',
  danger: 'bg-[#d94a3d] text-white hover:bg-[#c33e32] active:bg-[#ad3529]',
};

const BUTTON_SIZES = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4.5 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3.5 text-base gap-2',
};

export function Button({
  as,
  to,
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...props
}) {
  const classes = cx(
    'inline-flex items-center justify-center rounded-xl font-medium transition-colors duration-150',
    'disabled:cursor-not-allowed disabled:opacity-45',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45e0]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf7f1]',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className
  );

  const content = (
    <>
      {icon && <Icon name={icon} size={size === 'lg' ? 'md' : 'sm'} />}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  const Component = as || 'button';
  return (
    <Component className={classes} {...props}>
      {content}
    </Component>
  );
}

/** Square icon-only button, used for row actions where a label would crowd. */
export function IconButton({ icon, label, tone = 'neutral', className, ...props }) {
  const tones = {
    neutral: 'text-[#6d655a] hover:bg-[#f0eae0] hover:text-[#1c1a17]',
    brand: 'text-[#5b45e0] hover:bg-[#efecff]',
    warm: 'text-[#e07a3f] hover:bg-[#fdf1e8]',
    danger: 'text-[#a1978a] hover:bg-[#fbeceb] hover:text-[#d94a3d]',
  };

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cx(
        'inline-flex items-center justify-center rounded-lg p-2 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45e0]/40',
        tones[tone],
        className
      )}
      {...props}
    >
      <Icon name={icon} size="md" />
    </button>
  );
}

export function Card({ className, hover = false, children, ...props }) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-[#e8e0d3] bg-white',
        hover && 'transition-all duration-150 hover:border-[#d8cdba] hover:shadow-[0_2px_14px_rgba(28,26,23,0.07)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

const FIELD_CLASSES = cx(
  'w-full rounded-xl border border-[#e8e0d3] bg-white px-3.5 py-2.5 text-[#1c1a17]',
  'placeholder:text-[#a1978a] transition-colors',
  'focus:border-[#5b45e0] focus:outline-none focus:ring-2 focus:ring-[#5b45e0]/15',
  'disabled:bg-[#f4efe6] disabled:text-[#a1978a]'
);

export function Input({ label, hint, className, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-[#37322b]">{label}</span>}
      <input className={cx(FIELD_CLASSES, className)} {...props} />
      {hint && <span className="mt-1 block text-xs text-[#a1978a]">{hint}</span>}
    </label>
  );
}

export function Textarea({ label, className, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-[#37322b]">{label}</span>}
      <textarea className={cx(FIELD_CLASSES, 'resize-none p-4', className)} {...props} />
    </label>
  );
}

const BADGE_TONES = {
  neutral: 'bg-[#f4efe6] text-[#6d655a] ring-[#e8e0d3]',
  brand: 'bg-[#efecff] text-[#4733c4] ring-[#ddd6ff]',
  success: 'bg-[#e7f5ec] text-[#1f7a45] ring-[#c8e8d5]',
  warning: 'bg-[#fdf3e3] text-[#95601a] ring-[#f2e0bd]',
  danger: 'bg-[#fbeceb] text-[#a8352a] ring-[#f3d2cf]',
};

export function Badge({ tone = 'neutral', icon, className, children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1',
        BADGE_TONES[tone],
        className
      )}
    >
      {icon && <Icon name={icon} size="xs" />}
      {children}
    </span>
  );
}

/** The credit balance appears in a dozen places — always the same shape. */
export function CreditPill({ amount, tone = 'brand', className }) {
  return (
    <Badge tone={tone} icon="credit" className={cx('font-semibold', className)}>
      {amount}
    </Badge>
  );
}

export function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-7 w-7 border-[3px]', lg: 'h-10 w-10 border-[3px]' };
  return (
    <div
      className={cx(
        'animate-spin rounded-full border-[#e8e0d3] border-t-[#5b45e0]',
        sizes[size],
        className
      )}
    />
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1c1a17]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[#6d655a]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon = 'sparkle', title, description, action }) {
  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4efe6] text-[#a1978a]">
        <Icon name={icon} size="xl" />
      </span>
      <h3 className="mt-4 font-medium text-[#1c1a17]">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-[#6d655a]">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}

export function Skeleton({ className }) {
  return <div className={cx('shimmer rounded-xl bg-[#f4efe6]', className)} />;
}

/** Segmented control used wherever a page holds two or three sub-views. */
export function Segmented({ options, value, onChange, className }) {
  return (
    <div className={cx('inline-flex rounded-xl bg-[#f0eae0] p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
            value === option.value
              ? 'bg-white text-[#1c1a17] shadow-[0_1px_3px_rgba(28,26,23,0.09)]'
              : 'text-[#6d655a] hover:text-[#1c1a17]'
          )}
        >
          {option.icon && <Icon name={option.icon} size="sm" />}
          {option.label}
        </button>
      ))}
    </div>
  );
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

export { cx, STATUS_LABELS, Icon };
