import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import AnnouncementBanner from '../components/AnnouncementBanner';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { userApi } from '../api/user.api';

const STATUS_LABELS = {
  PENDING: 'Navbatda',
  PROCESSING: 'Jarayonda',
  COMPLETED: 'Tayyor',
  FAILED: 'Xato',
};

export default function Dashboard() {
  const { user, credits, refreshUser } = useAuth();
  const toast = useToast();

  const [recentGenerations, setRecentGenerations] = useState([]);
  const [stats, setStats] = useState(null);
  const [referrals, setReferrals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    Promise.all([
      userApi.getGenerations(1, 5).then((res) => setRecentGenerations(res.data.data)),
      userApi.getStats().then((res) => setStats(res.data.data)),
      userApi.getReferrals().then((res) => setReferrals(res.data.data)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const claimBonus = async () => {
    setClaiming(true);
    try {
      const res = await userApi.claimDailyBonus();
      await refreshUser();
      toast.success(`+${res.data.data.awarded} kredit qo'shildi!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bonus olishda xatolik.');
    } finally {
      setClaiming(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/register?ref=${referrals.referralCode}`;
    navigator.clipboard
      .writeText(link)
      .then(() => toast.success('Taklif havolasi nusxalandi'))
      .catch(() => toast.error("Nusxalab bo'lmadi"));
  };

  const bonusAvailable = user?.dailyBonus?.available;

  return (
    <Layout>
      <AnnouncementBanner />

      <div className="mb-8 mt-4">
        <h1 className="text-2xl font-bold text-gray-900">Salom, {user?.name}! 👋</h1>
        <p className="mt-1 text-gray-500">
          Joriy balansingiz: <span className="font-semibold text-indigo-600">💎 {credits} kredit</span>
        </p>
      </div>

      {bonusAvailable && (
        <button
          onClick={claimBonus}
          disabled={claiming}
          className="mb-6 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 p-4 text-left text-white shadow transition hover:scale-[1.01] disabled:opacity-60"
        >
          <span className="text-lg font-bold">🎁 Kunlik bonus tayyor!</span>
          <p className="text-sm text-amber-50">
            {claiming ? 'Olinmoqda...' : `Bosing va ${user.dailyBonus.amount} ta bepul kredit oling`}
          </p>
        </button>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          to="/generate/image"
          className="group flex flex-col items-start rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-white shadow-lg transition hover:scale-[1.02]"
        >
          <span className="text-4xl">🖼️</span>
          <h2 className="mt-4 text-xl font-bold">Rasm yaratish</h2>
          <p className="mt-1 text-indigo-100">G'oyangizni yozing, AI rasmga aylantiradi</p>
        </Link>

        <Link
          to="/generate/video"
          className="group flex flex-col items-start rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 p-8 text-white shadow-lg transition hover:scale-[1.02]"
        >
          <span className="text-4xl">🎬</span>
          <h2 className="mt-4 text-xl font-bold">Video yaratish</h2>
          <p className="mt-1 text-pink-100">G'oyangizni yozing, AI videoga aylantiradi</p>
        </Link>
      </div>

      {stats && stats.totalGenerations > 0 && (
        <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Jami', value: stats.totalGenerations },
            { label: 'Rasmlar', value: stats.byType.IMAGE || 0 },
            { label: 'Videolar', value: stats.byType.VIDEO || 0 },
            { label: 'Sevimlilar', value: stats.favorites },
          ].map((card) => (
            <div key={card.label} className="rounded-xl bg-white p-4 text-center shadow">
              <p className="text-xl font-bold text-gray-900">{card.value}</p>
              <p className="mt-0.5 text-xs text-gray-500">{card.label}</p>
            </div>
          ))}
        </section>
      )}

      {referrals && (
        <section className="mt-8 rounded-2xl bg-white p-5 shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">🎉 Do'stlarni taklif qiling</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Har bir do'st uchun {referrals.rewardPerReferral} kredit oling. Taklif qilingan:{' '}
                <strong>{referrals.referredCount}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="rounded-lg bg-gray-100 px-3 py-1.5 font-bold tracking-widest text-indigo-700">
                {referrals.referralCode}
              </code>
              <button
                onClick={copyReferralLink}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Nusxalash
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">So'nggi generatsiyalar</h2>
          <Link to="/history" className="text-sm font-medium text-indigo-600 hover:underline">
            Barchasi →
          </Link>
        </div>

        {loading && <p className="text-gray-500">Yuklanmoqda...</p>}

        {!loading && recentGenerations.length === 0 && (
          <p className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
            Hali hech narsa yaratmadingiz. Yuqoridan boshlang!
          </p>
        )}

        {!loading && recentGenerations.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-5">
            {recentGenerations.map((gen) => (
              <div key={gen.id} className="overflow-hidden rounded-xl bg-white shadow">
                <div className="flex aspect-square items-center justify-center bg-gray-100">
                  {gen.resultUrl ? (
                    gen.type === 'IMAGE' ? (
                      <img src={gen.resultUrl} alt={gen.userPrompt} className="h-full w-full object-cover" />
                    ) : (
                      <video src={gen.resultUrl} className="h-full w-full object-cover" muted />
                    )
                  ) : (
                    <span className="text-3xl">{gen.type === 'IMAGE' ? '🖼️' : '🎬'}</span>
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs text-gray-600">{gen.userPrompt}</p>
                  <p className="text-[11px] text-gray-400">{STATUS_LABELS[gen.status]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
