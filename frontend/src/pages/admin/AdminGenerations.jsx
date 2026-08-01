import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../api/admin.api';

const TYPE_OPTIONS = ['', 'IMAGE', 'VIDEO'];
const STATUS_OPTIONS = ['', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];

export default function AdminGenerations() {
  const [items, setItems] = useState([]);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = async (pageToLoad = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getGenerations(pageToLoad, 20, { type: type || undefined, status: status || undefined });
      setItems(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setPage(pageToLoad);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status]);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-white">Barcha generatsiyalar</h1>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt || 'Barcha turlar'}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt || 'Barcha holatlar'}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl bg-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="text-gray-400">
            <tr className="border-b border-gray-700">
              <th className="px-4 py-3">Foydalanuvchi</th>
              <th className="px-4 py-3">Turi</th>
              <th className="px-4 py-3">So'rov</th>
              <th className="px-4 py-3">Holat</th>
              <th className="px-4 py-3">Kredit</th>
              <th className="px-4 py-3">Sana</th>
            </tr>
          </thead>
          <tbody>
            {items.map((g) => (
              <tr key={g.id} className="border-b border-gray-700 text-gray-200">
                <td className="px-4 py-3">{g.user?.email}</td>
                <td className="px-4 py-3">{g.type}</td>
                <td className="max-w-xs truncate px-4 py-3">{g.userPrompt}</td>
                <td className="px-4 py-3">{g.status}</td>
                <td className="px-4 py-3">{g.creditsUsed}</td>
                <td className="px-4 py-3">{new Date(g.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="p-4 text-gray-500">Yuklanmoqda...</p>}
        {!loading && items.length === 0 && <p className="p-4 text-gray-500">Hech narsa topilmadi.</p>}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm text-gray-400">
          <button
            disabled={page <= 1}
            onClick={() => load(page - 1)}
            className="rounded-lg border border-gray-700 px-3 py-1.5 disabled:opacity-40"
          >
            Oldingi
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => load(page + 1)}
            className="rounded-lg border border-gray-700 px-3 py-1.5 disabled:opacity-40"
          >
            Keyingi
          </button>
        </div>
      )}
    </AdminLayout>
  );
}
