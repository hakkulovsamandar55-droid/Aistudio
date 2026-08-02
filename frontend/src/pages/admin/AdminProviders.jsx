import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../api/admin.api';
import { useToast } from '../../context/ToastContext';

const MODULE_LABELS = {
  IMAGE: '🖼️ Rasm',
  VIDEO: '🎬 Video',
  VOICE: '🎙️ Ovoz',
  MUSIC: '🎵 Musiqa',
  SCRIPT: '📝 Matn',
};

export default function AdminProviders() {
  const toast = useToast();

  const [providers, setProviders] = useState([]);
  const [encryptionConfigured, setEncryptionConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // provider id currently being edited
  const [form, setForm] = useState({ apiKey: '', baseUrl: '' });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getProviders();
      setProviders(res.data.data.providers);
      setEncryptionConfigured(res.data.data.encryptionConfigured);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = (provider) => {
    setEditing(provider.provider);
    setForm({ apiKey: '', baseUrl: provider.baseUrl || '' });
  };

  const closeEdit = () => {
    setEditing(null);
    setForm({ apiKey: '', baseUrl: '' });
  };

  const saveKey = async (provider) => {
    setBusy(true);
    try {
      const payload = { baseUrl: form.baseUrl || null };
      if (form.apiKey.trim()) payload.apiKey = form.apiKey.trim();

      await adminApi.updateProvider(provider, payload);
      toast.success('Saqlandi');
      closeEdit();
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Xatolik yuz berdi.');
    } finally {
      setBusy(false);
    }
  };

  const clearKey = async (provider) => {
    if (!window.confirm("Bu provayderning API kalitini o'chirmoqchimisiz?")) return;
    setBusy(true);
    try {
      await adminApi.updateProvider(provider, { apiKey: null, isEnabled: false });
      toast.success("Kalit o'chirildi");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const toggleEnabled = async (item) => {
    if (!item.hasKey) {
      toast.error('Avval API kalitini kiriting.');
      return;
    }
    setBusy(true);
    try {
      const updated = await adminApi.updateProvider(item.provider, { isEnabled: !item.isEnabled });
      toast.success(
        updated.data.data.isEnabled ? `${item.label} yoqildi` : `${item.label} o'chirildi`
      );
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-white">API kalitlar</h1>
      <p className="mt-1 text-sm text-gray-400">
        Har bir provayder uchun kalit kiriting va yoqing. Kalit kiritilmagan yoki o'chirilgan
        provayder uchun tizim avtomatik sinov (mock) rejimiga tushadi — sayt hech qachon buzilmaydi.
      </p>

      {!encryptionConfigured && (
        <div className="mt-4 rounded-xl bg-amber-900/30 p-4 text-sm text-amber-300 ring-1 ring-amber-700/40">
          ⚠️ Serverda <code className="rounded bg-black/30 px-1">SETTINGS_ENCRYPTION_KEY</code>{' '}
          sozlanmagan — kalitlarni saqlash bloklangan. <code>.env</code> fayliga qo'shing:{' '}
          <code className="rounded bg-black/30 px-1">openssl rand -hex 32</code>
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-gray-500">Yuklanmoqda...</p>
      ) : (
        <div className="mt-6 space-y-3">
          {providers.map((item) => (
            <div key={item.provider} className="rounded-xl bg-gray-800 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-white">{item.label}</h2>
                    <div className="flex gap-1">
                      {item.modules.map((m) => (
                        <span key={m} className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                          {MODULE_LABELS[m] || m}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-400">
                    {item.hasKey ? (
                      <>
                        Kalit: <code className="rounded bg-black/30 px-1.5 py-0.5">{item.maskedKey}</code>{' '}
                        <span className="text-gray-500">
                          ({item.keySource === 'admin' ? 'admin panel' : '.env fayl'})
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-500">Kalit kiritilmagan</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      item.isEnabled ? 'bg-emerald-900/40 text-emerald-300' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {item.isEnabled ? 'Yoqilgan' : "O'chirilgan"}
                  </span>
                  <button
                    onClick={() => toggleEnabled(item)}
                    disabled={busy}
                    className="rounded-lg border border-gray-600 px-3 py-1.5 text-xs hover:bg-gray-700 disabled:opacity-50"
                  >
                    {item.isEnabled ? "O'chirish" : 'Yoqish'}
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="rounded-lg border border-gray-600 px-3 py-1.5 text-xs hover:bg-gray-700"
                  >
                    {item.hasKey ? "Kalitni almashtirish" : "Kalit kiritish"}
                  </button>
                  {item.configuredInDb && item.hasKey && (
                    <button
                      onClick={() => clearKey(item.provider)}
                      disabled={busy}
                      className="rounded-lg border border-red-800 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950 disabled:opacity-50"
                    >
                      O'chirish
                    </button>
                  )}
                </div>
              </div>

              {editing === item.provider && (
                <div className="mt-4 space-y-2 border-t border-gray-700 pt-4">
                  <input
                    type="password"
                    value={form.apiKey}
                    onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Yangi API kalit"
                    autoComplete="off"
                    disabled={!encryptionConfigured}
                    className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                  />
                  <input
                    type="text"
                    value={form.baseUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                    placeholder="Base URL (ixtiyoriy, standart qiymat ishlatiladi)"
                    className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveKey(item.provider)}
                      disabled={busy || !encryptionConfigured || (!form.apiKey.trim() && !item.hasKey)}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Saqlash
                    </button>
                    <button
                      onClick={closeEdit}
                      className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-700"
                    >
                      Bekor qilish
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
