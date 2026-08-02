import { Icon } from './icons';
import { cx } from './ui';

const PLACEHOLDER_ICON = {
  IMAGE: 'image',
  VIDEO: 'video',
  VOICE: 'voice',
  MUSIC: 'music',
  SCRIPT: 'script',
};

/**
 * Renders whatever a generation produced — or a typed placeholder while it
 * has no file yet. Every grid in the app shows assets through this, so a
 * pending video and a finished one line up on the same visual grid.
 */
export default function MediaThumb({ generation, className, ratio = 'aspect-square' }) {
  const { resultUrl, type, userPrompt } = generation;

  if (!resultUrl) {
    return (
      <div
        className={cx(
          'flex items-center justify-center bg-[#f4efe6] text-[#c3b9a9]',
          ratio,
          className
        )}
      >
        <Icon name={PLACEHOLDER_ICON[type] || 'image'} size="xl" />
      </div>
    );
  }

  if (type === 'VOICE' || type === 'MUSIC') {
    return (
      <div
        className={cx(
          'flex items-center justify-center bg-[#efecff] text-[#5b45e0]',
          ratio,
          className
        )}
      >
        <Icon name={type === 'VOICE' ? 'voice' : 'music'} size="xl" />
      </div>
    );
  }

  if (type === 'VIDEO') {
    return (
      <div className={cx('relative bg-[#f4efe6]', ratio, className)}>
        <video src={resultUrl} className="h-full w-full object-cover" muted playsInline />
        <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white">
          <Icon name="play" size="xs" />
        </span>
      </div>
    );
  }

  return (
    <img
      src={resultUrl}
      alt={userPrompt || ''}
      loading="lazy"
      className={cx('w-full bg-[#f4efe6] object-cover', ratio, className)}
    />
  );
}
