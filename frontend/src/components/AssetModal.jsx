import { useEffect } from 'react';
import { Icon } from './icons';
import { Button, Badge, STATUS_LABELS } from './ui';

/**
 * Full-size viewer for one generated asset. Shared by the history grid and
 * the public gallery so an asset always opens the same way.
 */
export default function AssetModal({ asset, onClose, footer, meta }) {
  // Escape closes, and the page behind must not scroll while this is open.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  if (!asset) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1c1a17]/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="animate-rise max-h-[92vh] w-full max-w-2xl overflow-auto rounded-t-3xl border border-[#e8e0d3] bg-white p-5 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 font-medium text-[#1c1a17]">{asset.userPrompt}</p>
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="-mr-1 -mt-1 rounded-lg p-2 text-[#a1978a] transition-colors hover:bg-[#f0eae0] hover:text-[#1c1a17]"
          >
            <Icon name="close" size="md" />
          </button>
        </div>

        {asset.resultUrl ? (
          asset.type === 'VIDEO' ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={asset.resultUrl} controls className="w-full rounded-2xl bg-[#f4efe6]" />
          ) : asset.type === 'VOICE' || asset.type === 'MUSIC' ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <audio src={asset.resultUrl} controls className="w-full" />
          ) : (
            <img src={asset.resultUrl} alt={asset.userPrompt} className="w-full rounded-2xl bg-[#f4efe6]" />
          )
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-2xl bg-[#f4efe6] text-[#c3b9a9]">
            <Icon name={asset.type === 'VIDEO' ? 'video' : 'image'} size="2xl" />
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[#6d655a]">
          {asset.status && <Badge tone="neutral">{STATUS_LABELS[asset.status] || asset.status}</Badge>}
          {asset.style && asset.style !== 'auto' && <Badge tone="neutral">{asset.style}</Badge>}
          {meta}
          <span className="text-[#a1978a]">
            {new Date(asset.createdAt).toLocaleDateString('uz-UZ', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>

        {asset.status === 'FAILED' && asset.errorMessage && (
          <p className="mt-3 rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-[#a8352a]">
            {asset.errorMessage}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {footer}
          <Button onClick={onClose} variant="secondary" className="flex-1">
            Yopish
          </Button>
        </div>
      </div>
    </div>
  );
}
