import { useEffect, useState } from 'react';
import { announcementApi } from '../api/gallery.api';

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
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start justify-between gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900"
        >
          <span>📢 {item.message}</span>
          <button
            onClick={() => dismiss(item.id)}
            className="shrink-0 text-indigo-400 hover:text-indigo-700"
            aria-label="Yopish"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
