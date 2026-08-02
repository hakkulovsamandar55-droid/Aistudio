import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../api/admin.api';
import { useToast } from '../../context/ToastContext';

export default function AdminAnnouncements() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAnnouncements();
      setItems(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setBusy(true);
    try {
      await adminApi.createAnnouncement(message.trim());
      setMessage('');
      await load();
      toast.success("E'lon qo'shildi");
    } catch (err) {
      toast.error(err.response?.data?.error || 'Xatolik yuz berdi.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item) => {
    setBusy(true);
    try {
      await adminApi.updateAnnouncement(item.id, { isActive: !item.isActive });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm("Bu e'lonni o'chirmoqchimisiz?")) return;
    setBusy(true);
    try {
      await adminApi.deleteAnnouncement(item.id);
      await load();
      toast.success("O'chirildi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-[#1c1a17]">E'lonlar</h1>
      <p className="mt-1 text-sm text-[#6d655a]">
        Faol e'lonlar barcha foydalanuvchilarga dashboard tepasida banner sifatida ko'rsatiladi.
      </p>

      <form onSubmit={create} className="mt-6 flex max-w-2xl gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="E'lon matni..."
          className="w-full rounded-lg border border-[#e8e0d3] bg-white px-3 py-2 text-[#1c1a17] placeholder-[#a1978a] focus:border-[#5b45e0] focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !message.trim()}
          className="shrink-0 rounded-lg bg-[#5b45e0] px-5 py-2 font-medium text-[#1c1a17] hover:bg-[#4733c4] disabled:opacity-50"
        >
          Qo'shish
        </button>
      </form>

      <div className="mt-8 space-y-3">
        {loading && <p className="text-[#a1978a]">Yuklanmoqda...</p>}
        {!loading && items.length === 0 && <p className="text-[#a1978a]">Hali e'lon yo'q.</p>}

        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8e0d3] bg-white px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[#1c1a17]">{item.message}</p>
              <p className="mt-0.5 text-xs text-[#a1978a]">
                {new Date(item.createdAt).toLocaleString()} ·{' '}
                {item.isActive ? (
                  <span className="text-[#1f7a45]">Faol</span>
                ) : (
                  <span className="text-[#a1978a]">O'chirilgan</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggle(item)}
                disabled={busy}
                className="rounded-lg border border-[#e8e0d3] px-3 py-1.5 text-xs hover:bg-[#faf7f1] disabled:opacity-50"
              >
                {item.isActive ? "O'chirish" : 'Yoqish'}
              </button>
              <button
                onClick={() => remove(item)}
                disabled={busy}
                className="rounded-lg border border-red-800 px-3 py-1.5 text-xs text-[#a8352a] hover:bg-red-950 disabled:opacity-50"
              >
                Olib tashlash
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
