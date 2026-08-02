import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../api/admin.api';

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-[#e8e0d3] bg-white p-5">
      <p className="text-sm text-[#6d655a]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#1c1a17]">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[#a1978a]">{hint}</p>}
    </div>
  );
}

/** Minimal inline bar chart — avoids pulling a charting dependency for two series. */
const PLOT_HEIGHT_PX = 112;

function TrendChart({ title, series, color }) {
  const max = Math.max(...series.map((point) => point.count), 1);

  return (
    <div className="rounded-xl border border-[#e8e0d3] bg-white p-5">
      <h2 className="mb-4 font-semibold text-[#1c1a17]">{title}</h2>
      <div className="flex gap-2">
        {series.map((point) => {
          // Heights are computed in pixels rather than percentages: a
          // percentage would resolve against an auto-height flex parent and
          // collapse the bars to nothing.
          const barHeight = point.count === 0 ? 2 : Math.max(Math.round((point.count / max) * PLOT_HEIGHT_PX), 4);

          return (
            <div key={point.date} className="flex flex-1 flex-col items-center">
              <span className="mb-1 text-[10px] text-[#6d655a]">{point.count || ''}</span>
              <div
                className="flex w-full items-end"
                style={{ height: `${PLOT_HEIGHT_PX}px` }}
                title={`${point.date}: ${point.count}`}
              >
                <div
                  className={`w-full rounded-t ${point.count === 0 ? 'bg-[#f4efe6]' : color}`}
                  style={{ height: `${barHeight}px` }}
                />
              </div>
              <span className="mt-1 text-[10px] text-[#a1978a]">{point.date.slice(5)}</span>
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
      <h1 className="text-2xl font-bold text-[#1c1a17]">Statistika</h1>

      {loading && <p className="mt-6 text-[#6d655a]">Yuklanmoqda...</p>}
      {error && <p className="mt-6 text-[#a8352a]">{error}</p>}

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
              color="bg-[#5b45e0]"
            />
            <TrendChart
              title="Generatsiyalar (7 kun)"
              series={stats.trend.generations}
              color="bg-[#e07a3f]"
            />
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-[#e8e0d3] bg-white p-5">
              <h2 className="mb-3 font-semibold text-[#1c1a17]">Turi bo'yicha</h2>
              {Object.entries(stats.generationsByType).length === 0 && (
                <p className="text-sm text-[#a1978a]">Hali ma'lumot yo'q</p>
              )}
              {Object.entries(stats.generationsByType).map(([type, count]) => (
                <div key={type} className="flex justify-between border-b border-[#e8e0d3] py-2 text-sm">
                  <span className="text-[#37322b]">{type}</span>
                  <span className="font-medium text-[#1c1a17]">{count}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-[#e8e0d3] bg-white p-5">
              <h2 className="mb-3 font-semibold text-[#1c1a17]">Holat bo'yicha</h2>
              {Object.entries(stats.generationsByStatus).length === 0 && (
                <p className="text-sm text-[#a1978a]">Hali ma'lumot yo'q</p>
              )}
              {Object.entries(stats.generationsByStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between border-b border-[#e8e0d3] py-2 text-sm">
                  <span className="text-[#37322b]">{status}</span>
                  <span className="font-medium text-[#1c1a17]">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
