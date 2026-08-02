export default function StylePicker({ styles, value, onChange, disabled }) {
  if (!styles || styles.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">Uslub tanlang</p>
      <div className="flex flex-wrap gap-2">
        {styles.map((style) => {
          const selected = value === style.id;
          return (
            <button
              key={style.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(style.id)}
              className={`rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-50 ${
                selected
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-400'
              }`}
            >
              {style.emoji} {style.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
