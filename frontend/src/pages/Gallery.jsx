import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { galleryApi } from '../api/gallery.api';
import { useAuth } from '../context/AuthContext';

const FILTERS = [
  { value: undefined, label: 'Hammasi' },
  { value: 'IMAGE', label: 'Rasmlar' },
  { value: 'VIDEO', label: 'Videolar' },
];

export default function Gallery() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [type, setType] = useState(undefined);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    galleryApi
      .list(1, 24, type)
      .then((res) => {
        setItems(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
        setPage(1);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [type]);

  const loadMore = async () => {
    setLoading(true);
    try {
      const res = await galleryApi.list(page + 1, 24, type);
      setItems((prev) => [...prev, ...res.data.data]);
      setPage(page + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080c]">
      <header className="border-b border-white/8 bg-[#101018]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-bold text-white">
            AI Studio
          </Link>
          <div className="flex gap-2">
            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-white/5"
            >
              {isAuthenticated ? 'Dashboard' : 'Kirish'}
            </Link>
            {!isAuthenticated && (
              <Link
                to="/register"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                Boshlash
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-white">Galereya</h1>
        <p className="mt-1 text-zinc-500">Foydalanuvchilar yaratgan va ulashgan ishlar.</p>

        <div className="mt-4 flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setType(f.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                type === f.value ? 'bg-violet-600 text-white' : 'bg-[#101018] text-zinc-400 shadow'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && items.length === 0 && <p className="mt-8 text-zinc-500">Yuklanmoqda...</p>}

        {!loading && items.length === 0 && (
          <div className="mt-8 rounded-xl bg-[#101018] p-10 text-center shadow">
            <p className="text-zinc-500">Galereya hozircha bo'sh.</p>
            <p className="mt-1 text-sm text-zinc-600">
              O'z ishingizni birinchi bo'lib ulashing — tarix sahifasidan "Galereyaga joylash" tugmasini bosing.
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="overflow-hidden rounded-xl bg-[#101018] text-left shadow transition hover:shadow-lg"
            >
              <div className="flex aspect-square items-center justify-center bg-white/5">
                {item.type === 'IMAGE' ? (
                  <img src={item.resultUrl} alt={item.userPrompt} className="h-full w-full object-cover" />
                ) : (
                  <video src={item.resultUrl} className="h-full w-full object-cover" muted />
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm text-zinc-200">{item.userPrompt}</p>
                <p className="mt-1 text-xs text-zinc-600">
                  {item.user?.name} · {item.type === 'IMAGE' ? '🖼️' : '🎬'}
                </p>
              </div>
            </button>
          ))}
        </div>

        {!loading && page < totalPages && (
          <div className="mt-6 text-center">
            <button
              onClick={loadMore}
              className="rounded-lg border border-white/10 px-6 py-2.5 font-medium text-zinc-300 hover:bg-[#08080c]"
            >
              Ko'proq yuklash
            </button>
          </div>
        )}
      </main>

      {selected && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-[#101018] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {selected.type === 'IMAGE' ? (
              <img src={selected.resultUrl} alt={selected.userPrompt} className="w-full rounded-xl" />
            ) : (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={selected.resultUrl} controls className="w-full rounded-xl" />
            )}
            <p className="mt-4 text-zinc-200">{selected.userPrompt}</p>
            <p className="mt-1 text-sm text-zinc-600">
              {selected.user?.name} · {new Date(selected.createdAt).toLocaleDateString()}
            </p>
            <button
              onClick={() => setSelected(null)}
              className="mt-6 w-full rounded-lg border border-white/10 bg-black/30 text-white placeholder:text-zinc-600 py-2.5 font-medium text-zinc-300 hover:bg-[#08080c]"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
