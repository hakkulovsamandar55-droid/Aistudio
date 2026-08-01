import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { userApi } from '../api/user.api';

const FILTERS = [
  { value: undefined, label: 'Hammasi' },
  { value: 'IMAGE', label: 'Rasmlar' },
  { value: 'VIDEO', label: 'Videolar' },
];

const STATUS_LABELS = {
  PENDING: 'Navbatda',
  PROCESSING: 'Jarayonda',
  COMPLETED: 'Tayyor',
  FAILED: 'Xato',
};

export default function History() {
  const [filter, setFilter] = useState(undefined);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setItems([]);
    setPage(1);
    loadPage(1, filter, true);
  }, [filter]);

  const loadPage = async (pageToLoad, typeFilter, replace) => {
    setLoading(true);
    try {
      const response = await userApi.getGenerations(pageToLoad, 12, typeFilter);
      const { data, pagination } = response.data;
      setItems((prev) => (replace ? data : [...prev, ...data]));
      setTotalPages(pagination.totalPages);
      setPage(pageToLoad);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900">Tarix</h1>

      <div className="mt-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              filter === f.value ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 shadow'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && items.length === 0 && <p className="mt-8 text-gray-500">Yuklanmoqda...</p>}

      {!loading && items.length === 0 && (
        <p className="mt-8 rounded-xl bg-white p-6 text-center text-gray-500 shadow">
          Bu bo'limda hali generatsiya yo'q.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((gen) => (
          <button
            key={gen.id}
            onClick={() => setSelected(gen)}
            className="overflow-hidden rounded-xl bg-white text-left shadow transition hover:shadow-md"
          >
            <div className="flex aspect-video items-center justify-center bg-gray-100">
              {gen.resultUrl ? (
                gen.type === 'IMAGE' ? (
                  <img src={gen.resultUrl} alt={gen.userPrompt} className="h-full w-full object-cover" />
                ) : (
                  <video src={gen.resultUrl} className="h-full w-full object-cover" muted />
                )
              ) : (
                <span className="text-3xl">{gen.type === 'IMAGE' ? '🖼️' : '🎬'}</span>
              )}
            </div>
            <div className="p-3">
              <p className="truncate text-sm text-gray-800">{gen.userPrompt}</p>
              <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                <span>{new Date(gen.createdAt).toLocaleDateString()}</span>
                <span>{STATUS_LABELS[gen.status]}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {!loading && page < totalPages && (
        <div className="mt-6 text-center">
          <button
            onClick={() => loadPage(page + 1, filter, false)}
            className="rounded-lg border border-gray-300 px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
          >
            Ko'proq yuklash
          </button>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {selected.resultUrl ? (
              selected.type === 'IMAGE' ? (
                <img src={selected.resultUrl} alt={selected.userPrompt} className="w-full rounded-xl" />
              ) : (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={selected.resultUrl} controls className="w-full rounded-xl" />
              )
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl bg-gray-100 text-4xl">
                {selected.type === 'IMAGE' ? '🖼️' : '🎬'}
              </div>
            )}
            <p className="mt-4 text-gray-800">{selected.userPrompt}</p>
            <p className="mt-1 text-sm text-gray-400">
              {STATUS_LABELS[selected.status]} · {new Date(selected.createdAt).toLocaleString()}
            </p>
            {selected.status === 'FAILED' && selected.errorMessage && (
              <p className="mt-2 text-sm text-red-500">{selected.errorMessage}</p>
            )}
            <button
              onClick={() => setSelected(null)}
              className="mt-6 w-full rounded-lg border border-gray-300 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
