import { useEffect, useState } from 'react';
import { announcementApi } from '../api/gallery.api';
import { Icon } from './icons';

const DISMISSED_KEY = 'ai_studio_dismissed_announcements';

function readDismissed() {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY)) || [];
  } catch {
    return [];
  }
}

export default function AnnouncementBanner() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    announcementApi
      .list()
      .then((res) => {
        const dismissed = readDismissed();
        setItems(res.data.data.filter((item) => !dismissed.includes(item.id)));
      })
      .catch(() => setItems([]));
  }, []);

  const dismiss = (id) => {
    const dismissed = [...readDismissed(), id];
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  if (items.length === 0) return null;

  return (
    <div className="mb-5 space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 rounded-xl border border-[#ddd6ff] bg-[#efecff] px-4 py-3 text-sm text-[#4733c4]"
        >
          <span className="mt-0.5 shrink-0">
            <Icon name="megaphone" size="sm" />
          </span>
          <span className="flex-1">{item.message}</span>
          <button
            onClick={() => dismiss(item.id)}
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-1 text-[#8b7fd6] transition-colors hover:bg-white/60 hover:text-[#4733c4]"
            aria-label="Yopish"
          >
            <Icon name="close" size="sm" />
          </button>
        </div>
      ))}
    </div>
  );
}
