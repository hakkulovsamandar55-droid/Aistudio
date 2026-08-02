import { useCallback, useEffect, useState } from 'react';
import { userApi } from '../../api/user.api';
import { generationApi } from '../../api/generation.api';
import { useToast } from '../../context/ToastContext';
import MediaThumb from '../MediaThumb';
import AssetModal from '../AssetModal';
import { Icon } from '../icons';
import { Button, IconButton, Card, Spinner, EmptyState, Segmented, STATUS_LABELS, cx } from '../ui';

const FILTERS = [
  { value: 'all', label: 'Hammasi', params: {} },
  { value: 'image', label: 'Rasm', icon: 'image', params: { type: 'IMAGE' } },
  { value: 'video', label: 'Video', icon: 'video', params: { type: 'VIDEO' } },
  { value: 'favorite', label: 'Sevimli', icon: 'star', params: { favorite: 'true' } },
];

export default function HistoryView() {
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
        const filter = FILTERS.find((f) => f.value === filterKey) || FILTERS[0];
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
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedSearch(search.trim());
        }}
        className="relative"
      >
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a1978a]">
          <Icon name="search" size="md" />
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="So'rov matni bo'yicha qidirish"
          className={cx(
            'w-full rounded-xl border border-[#e8e0d3] bg-white py-2.5 pl-11 pr-24 text-[#1c1a17]',
            'placeholder:text-[#a1978a] focus:border-[#5b45e0] focus:outline-none focus:ring-2 focus:ring-[#5b45e0]/15'
          )}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
          {appliedSearch && (
            <IconButton
              icon="close"
              label="Tozalash"
              onClick={() => {
                setSearch('');
                setAppliedSearch('');
              }}
            />
          )}
          <Button type="submit" size="sm">
            Qidirish
          </Button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented options={FILTERS} value={filterKey} onChange={setFilterKey} />
        <span className="text-sm text-[#a1978a]">{total} ta</span>
      </div>

      {loading && items.length === 0 && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="mt-5">
          <EmptyState
            icon="clock"
            title={appliedSearch ? 'Hech narsa topilmadi' : "Bu bo'limda hali ish yo'q"}
            description={
              appliedSearch
                ? "Boshqa so'z bilan qidirib ko'ring."
                : "Yaratish bo'limidan boshlang."
            }
            action={
              !appliedSearch && (
                <Button to="/create" icon="create">
                  Yaratish
                </Button>
              )
            }
          />
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((gen) => (
          <Card key={gen.id} hover className="overflow-hidden">
            <button onClick={() => setSelected(gen)} className="block w-full text-left">
              <div className="relative">
                <MediaThumb generation={gen} />
                {gen.isPublic && (
                  <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#5b45e0] shadow-sm">
                    <Icon name="globe" size="xs" />
                  </span>
                )}
                {gen.isFavorite && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#e07a3f] shadow-sm">
                    <Icon name="starFilled" size="xs" />
                  </span>
                )}
              </div>
              <div className="px-3 pt-3">
                <p className="truncate text-sm text-[#37322b]">{gen.userPrompt}</p>
                <p className="mt-0.5 text-xs text-[#a1978a]">
                  {new Date(gen.createdAt).toLocaleDateString()} · {STATUS_LABELS[gen.status]}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-0.5 px-2 pb-2 pt-1.5">
              <IconButton
                icon={gen.isFavorite ? 'starFilled' : 'star'}
                label="Sevimlilarga"
                tone={gen.isFavorite ? 'warm' : 'neutral'}
                onClick={() => toggleFavorite(gen)}
              />
              {gen.status === 'COMPLETED' && (
                <>
                  <IconButton
                    icon={gen.isPublic ? 'globe' : 'lock'}
                    label="Galereyaga joylash"
                    tone={gen.isPublic ? 'brand' : 'neutral'}
                    onClick={() => togglePublic(gen)}
                  />
                  <IconButton icon="download" label="Yuklab olish" onClick={() => download(gen)} />
                </>
              )}
              <div className="flex-1" />
              <IconButton icon="trash" label="O'chirish" tone="danger" onClick={() => remove(gen)} />
            </div>
          </Card>
        ))}
      </div>

      {!loading && page < totalPages && (
        <div className="mt-6 text-center">
          <Button onClick={() => load(page + 1, false)} variant="secondary">
            Ko'proq yuklash
          </Button>
        </div>
      )}

      <AssetModal
        asset={selected}
        onClose={() => setSelected(null)}
        footer={
          selected?.status === 'COMPLETED' && (
            <Button icon="download" className="flex-1" onClick={() => download(selected)}>
              Yuklab olish
            </Button>
          )
        }
      />
    </>
  );
}
