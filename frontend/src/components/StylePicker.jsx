import { Icon } from './icons';
import { cx } from './ui';

export default function StylePicker({ styles, value, onChange, disabled, label = 'Uslub' }) {
  if (!styles || styles.length === 0) return null;

  return (
    <div>
      <p className="mb-2.5 text-sm font-medium text-[#37322b]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {styles.map((style) => {
          const selected = value === style.id;
          return (
            <button
              key={style.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(style.id)}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors disabled:opacity-50',
                selected
                  ? 'border-[#5b45e0] bg-[#efecff] font-medium text-[#4733c4]'
                  : 'border-[#e8e0d3] bg-white text-[#6d655a] hover:border-[#d8cdba] hover:text-[#1c1a17]'
              )}
            >
              <Icon name={style.icon || 'sparkle'} size="sm" />
              {style.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
