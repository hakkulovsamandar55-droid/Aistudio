import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../api/admin.api';

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-xl bg-gray-800 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

/** Minimal inline bar chart — avoids pulling a charting dependency for two series. */
const PLOT_HEIGHT_PX = 112;

function TrendChart({ title, series, color }) {
  const max = Math.max(...series.map((point) => point.count), 1);

  return (
    <div className="rounded-xl bg-gray-800 p-5">
      <h2 className="mb-4 font-semibold text-white">{title}</h2>
      <div className="flex gap-2">
        {series.map((point) => {
          // Heights are computed in pixels rather than percentages: a
          // percentage would resolve against an auto-height flex parent and
          // collapse the bars to nothing.
          const barHeight = point.count === 0 ? 2 : Math.max(Math.round((point.count / max) * PLOT_HEIGHT_PX), 4);

          return (
            <div key={point.date} className="flex flex-1 flex-col items-center">
              <span className="mb-1 text-[10px] text-gray-400">{point.count || ''}</span>
              <div
                className="flex w-full items-end"
                style={{ height: `${PLOT_HEIGHT_PX}px` }}
                title={`${point.date}: ${point.count}`}
              >
                <div
                  className={`w-full rounded-t ${point.count === 0 ? 'bg-gray-700' : color}`}
                  style={{ height: `${barHeight}px` }}
                />
              </div>
              <span className="mt-1 text-[10px] text-gray-500">{point.date.slice(5)}</span>
            </div>
          );
        })}
      </div>
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
            <StatCard
              label="Foydalanuvchilar"
              value={stats.totalUsers}
              hint={`${stats.activeUsers} faol`}
            />
            <StatCard
              label="Generatsiyalar"
              value={stats.totalGenerations}
              hint={stats.successRate !== null ? `${stats.successRate}% muvaffaqiyatli` : undefined}
            />
            <StatCard
              label="Sotilgan kreditlar"
              value={stats.creditsSold}
              hint={`${stats.totalPurchases} ta to'lov`}
            />
            <StatCard
              label="Muomaladagi kredit"
              value={stats.creditsOutstanding}
              hint="foydalanuvchilar balansi"
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <TrendChart
              title="Yangi foydalanuvchilar (7 kun)"
              series={stats.trend.signups}
              color="bg-indigo-500"
            />
            <TrendChart
              title="Generatsiyalar (7 kun)"
              series={stats.trend.generations}
              color="bg-pink-500"
            />
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-800 p-5">
              <h2 className="mb-3 font-semibold text-white">Turi bo'yicha</h2>
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
              <h2 className="mb-3 font-semibold text-white">Holat bo'yicha</h2>
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
