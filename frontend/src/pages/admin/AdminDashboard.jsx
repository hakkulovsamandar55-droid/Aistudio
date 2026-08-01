import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../api/admin.api';

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-800 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .getStats()
      .then((res) => setStats(res.data.data))
      .catch(() => setError("Statistikani yuklab bo'lmadi."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-white">Statistika</h1>

      {loading && <p className="mt-6 text-gray-400">Yuklanmoqda...</p>}
      {error && <p className="mt-6 text-red-400">{error}</p>}

      {stats && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Jami foydalanuvchilar" value={stats.totalUsers} />
            <StatCard label="Jami generatsiyalar" value={stats.totalGenerations} />
            <StatCard label="Sotilgan kreditlar" value={stats.creditsSold} />
            <StatCard label="To'lovlar soni" value={stats.totalPurchases} />
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-800 p-5">
              <h2 className="mb-3 font-semibold text-white">Turi bo'yicha generatsiyalar</h2>
              {Object.entries(stats.generationsByType).length === 0 && (
                <p className="text-sm text-gray-500">Hali ma'lumot yo'q</p>
              )}
              {Object.entries(stats.generationsByType).map(([type, count]) => (
                <div key={type} className="flex justify-between border-b border-gray-700 py-2 text-sm">
                  <span className="text-gray-300">{type}</span>
                  <span className="font-medium text-white">{count}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-gray-800 p-5">
              <h2 className="mb-3 font-semibold text-white">Holat bo'yicha generatsiyalar</h2>
              {Object.entries(stats.generationsByStatus).length === 0 && (
                <p className="text-sm text-gray-500">Hali ma'lumot yo'q</p>
              )}
              {Object.entries(stats.generationsByStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between border-b border-gray-700 py-2 text-sm">
                  <span className="text-gray-300">{status}</span>
                  <span className="font-medium text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
