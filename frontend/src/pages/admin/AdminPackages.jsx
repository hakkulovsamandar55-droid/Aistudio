import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../api/admin.api';

const emptyForm = { name: '', credits: '', priceUsd: '', stripePriceId: '' };

export default function AdminPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPackages();
      setPackages(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await adminApi.createPackage({
        name: form.name,
        credits: Number(form.credits),
        priceUsd: Number(form.priceUsd),
        stripePriceId: form.stripePriceId,
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Paket yaratishda xatolik yuz berdi.");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (pkg) => {
    setBusyId(pkg.id);
    try {
      await adminApi.updatePackage(pkg.id, { isActive: !pkg.isActive });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-[#1c1a17]">Kredit paketlari</h1>

      <div className="mt-6 overflow-x-auto rounded-xl border border-[#e8e0d3] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-[#6d655a]">
            <tr className="border-b border-[#e8e0d3]">
              <th className="px-4 py-3">Nomi</th>
              <th className="px-4 py-3">Kredit</th>
              <th className="px-4 py-3">Narx</th>
              <th className="px-4 py-3">Stripe Price ID</th>
              <th className="px-4 py-3">Holat</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <tr key={pkg.id} className="border-b border-[#e8e0d3] text-[#37322b]">
                <td className="px-4 py-3">{pkg.name}</td>
                <td className="px-4 py-3">{pkg.credits}</td>
                <td className="px-4 py-3">${pkg.priceUsd}</td>
                <td className="px-4 py-3 text-xs text-[#6d655a]">{pkg.stripePriceId}</td>
                <td className="px-4 py-3">
                  {pkg.isActive ? (
                    <span className="text-[#1f7a45]">Faol</span>
                  ) : (
                    <span className="text-[#a1978a]">O'chirilgan</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(pkg)}
                    disabled={busyId === pkg.id}
                    className="rounded-lg border border-[#e8e0d3] px-3 py-1 text-xs hover:bg-[#faf7f1] disabled:opacity-50"
                  >
                    {pkg.isActive ? "O'chirish" : 'Yoqish'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="p-4 text-[#a1978a]">Yuklanmoqda...</p>}
      </div>

      <form onSubmit={handleCreate} className="mt-8 max-w-lg space-y-3 rounded-xl border border-[#e8e0d3] bg-white p-5">
        <h2 className="font-semibold text-[#1c1a17]">Yangi paket qo'shish</h2>
        {error && <p className="text-sm text-[#a8352a]">{error}</p>}
        <input
          required
          value={form.name}
          onChange={update('name')}
          placeholder="Nomi (masalan Mega)"
          className="w-full rounded-lg border border-[#e8e0d3] bg-[#faf7f1] px-3 py-2 text-sm text-[#1c1a17]"
        />
        <div className="flex gap-3">
          <input
            required
            type="number"
            value={form.credits}
            onChange={update('credits')}
            placeholder="Kredit soni"
            className="w-1/2 rounded-lg border border-[#e8e0d3] bg-[#faf7f1] px-3 py-2 text-sm text-[#1c1a17]"
          />
          <input
            required
            type="number"
            step="0.01"
            value={form.priceUsd}
            onChange={update('priceUsd')}
            placeholder="Narx (USD)"
            className="w-1/2 rounded-lg border border-[#e8e0d3] bg-[#faf7f1] px-3 py-2 text-sm text-[#1c1a17]"
          />
        </div>
        <input
          required
          value={form.stripePriceId}
          onChange={update('stripePriceId')}
          placeholder="Stripe Price ID (price_...)"
          className="w-full rounded-lg border border-[#e8e0d3] bg-[#faf7f1] px-3 py-2 text-sm text-[#1c1a17]"
        />
        <button
          type="submit"
          disabled={creating}
          className="w-full rounded-lg bg-[#5b45e0] py-2 text-sm font-medium text-[#1c1a17] hover:bg-[#4733c4] disabled:opacity-50"
        >
          {creating ? 'Yaratilmoqda...' : "Qo'shish"}
        </button>
      </form>
    </AdminLayout>
  );
}
