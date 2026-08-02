import { useCallback, useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { userApi } from '../api/user.api';
import { generationApi } from '../api/generation.api';
import { useToast } from '../context/ToastContext';

const FILTERS = [
  { key: 'all', label: 'Hammasi', params: {} },
  { key: 'image', label: 'Rasmlar', params: { type: 'IMAGE' } },
  { key: 'video', label: 'Videolar', params: { type: 'VIDEO' } },
  { key: 'favorite', label: '★ Sevimlilar', params: { favorite: 'true' } },
];

const STATUS_LABELS = {
  PENDING: 'Navbatda',
  PROCESSING: 'Jarayonda',
  COMPLETED: 'Tayyor',
  FAILED: 'Xato',
};

export default function History() {
  const toast = useToast();

  const [filterKey, setFilterKey] = useState('all');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(
    async (pageToLoad, replace) => {
      setLoading(true);
      try {
        const filter = FILTERS.find((f) => f.key === filterKey) || FILTERS[0];
        const params = { ...filter.params };
        if (appliedSearch) params.search = appliedSearch;

        const res = await userApi.getGenerations(pageToLoad, 12, params);
        const { data, pagination } = res.data;
        setItems((prev) => (replace ? data : [...prev, ...data]));
        setTotalPages(pagination.totalPages);
        setTotal(pagination.total);
        setPage(pageToLoad);
      } finally {
        setLoading(false);
      }
    },
    [filterKey, appliedSearch]
  );

  useEffect(() => {
    load(1, true);
  }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setAppliedSearch(search.trim());
  };

  const patchItem = (updated) => {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setSelected((prev) => (prev && prev.id === updated.id ? updated : prev));
  };

  const toggleFavorite = async (generation) => {
    try {
      const res = await generationApi.setFavorite(generation.id, !generation.isFavorite);
      patchItem(res.data.data);
    } catch {
      toast.error('Xatolik yuz berdi.');
    }
  };

  const togglePublic = async (generation) => {
    try {
      const res = await generationApi.setPublic(generation.id, !generation.isPublic);
      patchItem(res.data.data);
      toast.success(res.data.data.isPublic ? 'Galereyaga joylandi' : 'Galereyadan olib tashlandi');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Xatolik yuz berdi.');
    }
  };

  const remove = async (generation) => {
    if (!window.confirm("Bu generatsiyani o'chirmoqchimisiz?")) return;
    try {
      await generationApi.remove(generation.id);
      setItems((prev) => prev.filter((item) => item.id !== generation.id));
      setTotal((prev) => Math.max(prev - 1, 0));
      setSelected(null);
      toast.success("O'chirildi");
    } catch {
      toast.error("O'chirishda xatolik yuz berdi.");
    }
  };

  const download = async (generation) => {
    try {
      const ext = generation.type === 'VIDEO' ? 'mp4' : 'png';
      await generationApi.download(generation.id, `ai-studio-${generation.id}.${ext}`);
    } catch {
      toast.error('Yuklab olishda xatolik yuz berdi.');
    }
  };

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Tarix</h1>
        <span className="text-sm text-gray-500">{total} ta generatsiya</span>
      </div>

      <form onSubmit={handleSearch} className="mt-4 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="So'rov matni bo'yicha qidirish..."
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
          Qidirish
        </button>
        {appliedSearch && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setAppliedSearch('');
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600"
          >
            Tozalash
          </button>
        )}
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterKey(f.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              filterKey === f.key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 shadow'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && items.length === 0 && <p className="mt-8 text-gray-500">Yuklanmoqda...</p>}

      {!loading && items.length === 0 && (
        <p className="mt-8 rounded-xl bg-white p-6 text-center text-gray-500 shadow">
          {appliedSearch ? "Qidiruv bo'yicha hech narsa topilmadi." : "Bu bo'limda hali generatsiya yo'q."}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((gen) => (
          <div key={gen.id} className="overflow-hidden rounded-xl bg-white shadow transition hover:shadow-md">
            <button onClick={() => setSelected(gen)} className="block w-full text-left">
              <div className="relative flex aspect-video items-center justify-center bg-gray-100">
                {gen.resultUrl ? (
                  gen.type === 'IMAGE' ? (
                    <img src={gen.resultUrl} alt={gen.userPrompt} className="h-full w-full object-cover" />
                  ) : (
                    <video src={gen.resultUrl} className="h-full w-full object-cover" muted />
                  )
                ) : (
                  <span className="text-3xl">{gen.type === 'IMAGE' ? '🖼️' : '🎬'}</span>
                )}
                {gen.isPublic && (
                  <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                    🌍
                  </span>
                )}
              </div>
              <div className="px-3 pt-3">
                <p className="truncate text-sm text-gray-800">{gen.userPrompt}</p>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                  <span>{new Date(gen.createdAt).toLocaleDateString()}</span>
                  <span>{STATUS_LABELS[gen.status]}</span>
                </div>
              </div>
            </button>

            <div className="flex gap-1 px-2 pb-2 pt-2">
              <button
                onClick={() => toggleFavorite(gen)}
                title="Sevimlilar"
                className="flex-1 rounded-lg py-1 text-sm hover:bg-gray-100"
              >
                {gen.isFavorite ? '★' : '☆'}
              </button>
              {gen.status === 'COMPLETED' && (
                <>
                  <button
                    onClick={() => togglePublic(gen)}
                    title="Galereyaga joylash"
                    className="flex-1 rounded-lg py-1 text-sm hover:bg-gray-100"
                  >
                    {gen.isPublic ? '🌍' : '🔒'}
                  </button>
                  <button
                    onClick={() => download(gen)}
                    title="Yuklab olish"
                    className="flex-1 rounded-lg py-1 text-sm hover:bg-gray-100"
                  >
                    ⬇️
                  </button>
                </>
              )}
              <button
                onClick={() => remove(gen)}
                title="O'chirish"
                className="flex-1 rounded-lg py-1 text-sm hover:bg-red-50"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {!loading && page < totalPages && (
        <div className="mt-6 text-center">
          <button
            onClick={() => load(page + 1, false)}
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
              {selected.style && selected.style !== 'auto' && ` · ${selected.style}`}
            </p>
            {selected.status === 'FAILED' && selected.errorMessage && (
              <p className="mt-2 text-sm text-red-500">{selected.errorMessage}</p>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {selected.status === 'COMPLETED' && (
                <button
                  onClick={() => download(selected)}
                  className="flex-1 rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700"
                >
                  Yuklab olish
                </button>
              )}
              <button
                onClick={() => setSelected(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
