import { useEffect, useState } from 'react';
import { galleryApi } from '../../api/gallery.api';
import MediaThumb from '../MediaThumb';
import AssetModal from '../AssetModal';
import { Button, Card, Spinner, EmptyState, Segmented } from '../ui';

const FILTERS = [
  { value: 'all', label: 'Hammasi' },
  { value: 'IMAGE', label: 'Rasm', icon: 'image' },
  { value: 'VIDEO', label: 'Video', icon: 'video' },
];

export default function GalleryView() {
  const [items, setItems] = useState([]);
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    galleryApi
      .list(1, 24, type === 'all' ? undefined : type)
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
      const res = await galleryApi.list(page + 1, 24, type === 'all' ? undefined : type);
      setItems((prev) => [...prev, ...res.data.data]);
      setPage(page + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Segmented options={FILTERS} value={type} onChange={setType} />

      {loading && items.length === 0 && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="mt-5">
          <EmptyState
            icon="gallery"
            title="Galereya hozircha bo'sh"
            description="Tarix bo'limidan o'z ishingizni birinchi bo'lib ulashing."
          />
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} hover className="overflow-hidden">
            <button onClick={() => setSelected(item)} className="block w-full text-left">
              <MediaThumb generation={item} />
              <div className="p-3">
                <p className="truncate text-sm text-[#37322b]">{item.userPrompt}</p>
                <p className="mt-0.5 truncate text-xs text-[#a1978a]">{item.user?.name}</p>
              </div>
            </button>
          </Card>
        ))}
      </div>

      {!loading && page < totalPages && (
        <div className="mt-6 text-center">
          <Button onClick={loadMore} variant="secondary">
            Ko'proq yuklash
          </Button>
        </div>
      )}

      <AssetModal
        asset={selected}
        onClose={() => setSelected(null)}
        meta={selected?.user?.name}
      />
    </>
  );
}
