import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../api/admin.api';

function StatCard({ label, value, tone }) {
  const toneClass = tone === 'good' ? 'text-emerald-400' : tone === 'bad' ? 'text-red-400' : 'text-white';
  return (
    <div className="rounded-xl bg-gray-800 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

export default function AdminEconomics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .getEconomics()
      .then((res) => setData(res.data.data))
      .catch(() => setError("Ma'lumotni yuklab bo'lmadi."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-white">Iqtisodiyot</h1>
      <p className="mt-1 text-sm text-gray-400">
        So'nggi 30 kunlik taxminiy hisob — e'lon qilingan provayder narxlari asosida (haqiqiy
        hisob-kitob emas).
      </p>

      {loading && <p className="mt-6 text-gray-400">Yuklanmoqda...</p>}
      {error && <p className="mt-6 text-red-400">{error}</p>}

      {data && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Taxminiy xarajat" value={`$${data.estimatedCostUsd}`} tone="bad" />
            <StatCard label="Kredit qiymati (sarflangan)" value={`$${data.creditValueUsd}`} />
            <StatCard
              label="Taxminiy marja"
              value={`$${data.estimatedMarginUsd}`}
              tone={data.estimatedMarginUsd >= 0 ? 'good' : 'bad'}
            />
            <StatCard label="Sotib olingan kredit" value={`${data.creditsPurchased} (~$${data.purchaseRevenueUsd})`} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-gray-800 p-5">
              <h2 className="mb-3 font-semibold text-white">Modul / provayder bo'yicha (30 kun)</h2>
              {data.breakdown.length === 0 && <p className="text-sm text-gray-500">Ma'lumot yo'q</p>}
              {data.breakdown.map((row) => (
                <div
                  key={`${row.module}-${row.provider}`}
                  className="flex items-center justify-between border-b border-gray-700 py-2 text-sm"
                >
                  <div>
                    <span className="text-gray-200">{row.module}</span>{' '}
                    <span className="text-gray-500">· {row.provider}</span>
                    <p className="text-xs text-gray-500">{row.generations} ta generatsiya</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400">${row.estimatedCostUsd}</p>
                    <p className="text-xs text-gray-500">{row.credits} kredit</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-gray-800 p-5">
              <h2 className="mb-3 font-semibold text-white">Video sifat darajalari — marja</h2>
              {data.videoTiers.map((tier) => (
                <div key={tier.tier} className="flex items-center justify-between border-b border-gray-700 py-2 text-sm">
                  <div>
                    <span className="text-gray-200">{tier.label}</span>{' '}
                    <span className="text-gray-500">· {tier.provider}</span>
                  </div>
                  <div className="text-right">
                    <p className={tier.marginUsd >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      ${tier.marginUsd} ({tier.marginPercent}%)
                    </p>
                    <p className="text-xs text-gray-500">
                      xarajat ${tier.costUsd} · daromad ${tier.revenueUsd}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-xl bg-gray-800 p-5">
            <h2 className="mb-3 font-semibold text-white">Foydalanuvchilar tarif bo'yicha</h2>
            <div className="flex gap-6 text-sm">
              {data.plans.map((plan) => (
                <div key={plan.id}>
                  <p className="text-2xl font-bold text-white">{data.usersByPlan[plan.id] || 0}</p>
                  <p className="text-gray-500">
                    {plan.label} {plan.priceUsd > 0 && `($${plan.priceUsd}/oy)`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
