import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../api/admin.api';

function StatCard({ label, value, tone }) {
  const toneClass = tone === 'good' ? 'text-[#1f7a45]' : tone === 'bad' ? 'text-[#a8352a]' : 'text-[#1c1a17]';
  return (
    <div className="rounded-xl border border-[#e8e0d3] bg-white p-5">
      <p className="text-sm text-[#6d655a]">{label}</p>
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
      <h1 className="text-2xl font-bold text-[#1c1a17]">Iqtisodiyot</h1>
      <p className="mt-1 text-sm text-[#6d655a]">
        So'nggi 30 kunlik taxminiy hisob — e'lon qilingan provayder narxlari asosida (haqiqiy
        hisob-kitob emas).
      </p>

      {loading && <p className="mt-6 text-[#6d655a]">Yuklanmoqda...</p>}
      {error && <p className="mt-6 text-[#a8352a]">{error}</p>}

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
            <div className="rounded-xl border border-[#e8e0d3] bg-white p-5">
              <h2 className="mb-3 font-semibold text-[#1c1a17]">Modul / provayder bo'yicha (30 kun)</h2>
              {data.breakdown.length === 0 && <p className="text-sm text-[#a1978a]">Ma'lumot yo'q</p>}
              {data.breakdown.map((row) => (
                <div
                  key={`${row.module}-${row.provider}`}
                  className="flex items-center justify-between border-b border-[#e8e0d3] py-2 text-sm"
                >
                  <div>
                    <span className="text-[#37322b]">{row.module}</span>{' '}
                    <span className="text-[#a1978a]">· {row.provider}</span>
                    <p className="text-xs text-[#a1978a]">{row.generations} ta generatsiya</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#a8352a]">${row.estimatedCostUsd}</p>
                    <p className="text-xs text-[#a1978a]">{row.credits} kredit</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-[#e8e0d3] bg-white p-5">
              <h2 className="mb-3 font-semibold text-[#1c1a17]">Video sifat darajalari — marja</h2>
              {data.videoTiers.map((tier) => (
                <div key={tier.tier} className="flex items-center justify-between border-b border-[#e8e0d3] py-2 text-sm">
                  <div>
                    <span className="text-[#37322b]">{tier.label}</span>{' '}
                    <span className="text-[#a1978a]">· {tier.provider}</span>
                  </div>
                  <div className="text-right">
                    <p className={tier.marginUsd >= 0 ? 'text-[#1f7a45]' : 'text-[#a8352a]'}>
                      ${tier.marginUsd} ({tier.marginPercent}%)
                    </p>
                    <p className="text-xs text-[#a1978a]">
                      xarajat ${tier.costUsd} · daromad ${tier.revenueUsd}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-[#e8e0d3] bg-white p-5">
            <h2 className="mb-3 font-semibold text-[#1c1a17]">Foydalanuvchilar tarif bo'yicha</h2>
            <div className="flex gap-6 text-sm">
              {data.plans.map((plan) => (
                <div key={plan.id}>
                  <p className="text-2xl font-bold text-[#1c1a17]">{data.usersByPlan[plan.id] || 0}</p>
                  <p className="text-[#a1978a]">
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
