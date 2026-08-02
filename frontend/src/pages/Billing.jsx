import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { paymentApi } from '../api/payment.api';
import { useAuth } from '../context/AuthContext';

export default function Billing() {
  const { credits } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    paymentApi
      .getPackages()
      .then((res) => setPackages(res.data.data))
      .catch(() => setError('Kredit paketlarini yuklab bo\'lmadi.'))
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async (packageId) => {
    setPurchasingId(packageId);
    setError('');
    try {
      const response = await paymentApi.createCheckout(packageId);
      window.location.href = response.data.data.checkoutUrl;
    } catch (err) {
      setError(err.response?.data?.error || "To'lov sahifasiga o'tishda xatolik yuz berdi.");
      setPurchasingId(null);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-white">Kredit sotib olish</h1>
        <p className="mt-1 text-zinc-500">
          Joriy balansingiz: <span className="font-semibold text-violet-400">💎 {credits} kredit</span>
        </p>

        {error && <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</div>}

        {loading ? (
          <p className="mt-8 text-zinc-500">Yuklanmoqda...</p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {packages.map((pkg) => (
              <div key={pkg.id} className="flex flex-col rounded-2xl bg-[#101018] p-6 text-center shadow">
                <h2 className="text-lg font-bold text-white">{pkg.name}</h2>
                <p className="mt-2 text-3xl font-extrabold text-violet-400">{pkg.credits}</p>
                <p className="text-sm text-zinc-500">kredit</p>
                <p className="mt-4 text-xl font-semibold text-white">${pkg.priceUsd}</p>
                <button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchasingId === pkg.id}
                  className="mt-6 rounded-lg bg-violet-600 py-2.5 font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {purchasingId === pkg.id ? "O'tilmoqda..." : 'Sotib olish'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
