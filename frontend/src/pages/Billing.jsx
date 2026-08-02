import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Icon } from '../components/icons';
import { paymentApi } from '../api/payment.api';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Badge, Spinner, cx } from '../components/ui';

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
      .catch(() => setError("Kredit paketlarini yuklab bo'lmadi."))
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

  // The middle package is the one most people should pick, so it is the one
  // the eye lands on.
  const highlightIndex = packages.length > 1 ? 1 : 0;

  return (
    <Layout title="Kredit sotib olish" back="/profile">
      <Card className="flex items-center gap-4 p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#efecff] text-[#5b45e0]">
          <Icon name="credit" size="lg" />
        </span>
        <div>
          <p className="text-sm text-[#6d655a]">Joriy balans</p>
          <p className="text-2xl font-semibold text-[#1c1a17]">{credits} kredit</p>
        </div>
      </Card>

      {error && (
        <div className="mt-4 rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-[#a8352a]">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {packages.map((pkg, index) => {
            const highlighted = index === highlightIndex;
            return (
              <Card
                key={pkg.id}
                className={cx(
                  'flex flex-col p-5 text-center',
                  highlighted && 'border-[#5b45e0] ring-1 ring-[#5b45e0]'
                )}
              >
                {highlighted && (
                  <Badge tone="brand" className="mx-auto mb-2.5">
                    Ommabop
                  </Badge>
                )}
                <h2 className="font-medium text-[#1c1a17]">{pkg.name}</h2>
                <p className="mt-3 text-3xl font-semibold text-[#5b45e0]">{pkg.credits}</p>
                <p className="text-sm text-[#a1978a]">kredit</p>
                <p className="mt-3 text-xl font-semibold text-[#1c1a17]">${pkg.priceUsd}</p>
                <Button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchasingId === pkg.id}
                  variant={highlighted ? 'primary' : 'secondary'}
                  className="mt-5 w-full"
                  icon="card"
                >
                  {purchasingId === pkg.id ? "O'tilmoqda..." : 'Sotib olish'}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-5 flex items-start gap-3 bg-[#f4efe6] p-4">
        <span className="mt-0.5 shrink-0 text-[#a1978a]">
          <Icon name="info" size="md" />
        </span>
        <p className="text-sm text-[#6d655a]">
          Bitta rasm 2 kredit, video esa sifat darajasiga qarab 8 dan 60 kreditgacha turadi.
          Kreditlar muddatsiz — yonib ketmaydi.
        </p>
      </Card>
    </Layout>
  );
}
