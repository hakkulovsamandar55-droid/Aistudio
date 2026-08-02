import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { userApi } from '../api/user.api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [referrals, setReferrals] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);

  useEffect(() => {
    userApi.getReferrals().then((res) => setReferrals(res.data.data)).catch(() => {});
    userApi.getStats().then((res) => setStats(res.data.data)).catch(() => {});
  }, []);

  const saveName = async (e) => {
    e.preventDefault();
    setSavingName(true);
    try {
      await userApi.updateMe(name.trim());
      await refreshUser();
      toast.success('Profil yangilandi');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Xatolik yuz berdi.');
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwords.next.length < 8) {
      setPasswordError("Yangi parol kamida 8 belgidan iborat bo'lishi kerak");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError('Parollar mos kelmadi');
      return;
    }

    setSavingPassword(true);
    try {
      await userApi.changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      toast.success("Parol o'zgartirildi");
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Xatolik yuz berdi.');
    } finally {
      setSavingPassword(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/register?ref=${referrals.referralCode}`;
    navigator.clipboard
      .writeText(link)
      .then(() => toast.success('Havola nusxalandi'))
      .catch(() => toast.error('Nusxalab bo\'lmadi'));
  };

  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-8">
        <h1 className="text-2xl font-bold text-gray-900">Sozlamalar</h1>

        {stats && (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Generatsiyalar', value: stats.totalGenerations },
              { label: 'Sevimlilar', value: stats.favorites },
              { label: 'Ulashilgan', value: stats.shared },
              { label: 'Sarflangan kredit', value: stats.creditsSpent },
            ].map((card) => (
              <div key={card.label} className="rounded-xl bg-white p-4 text-center shadow">
                <p className="text-xl font-bold text-gray-900">{card.value}</p>
                <p className="mt-0.5 text-xs text-gray-500">{card.label}</p>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="font-semibold text-gray-900">Profil</h2>
          <form onSubmit={saveName} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                value={user?.email || ''}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Ism</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={savingName || !name.trim() || name.trim() === user?.name}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingName ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </form>
        </section>

        {referrals && (
          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="font-semibold text-gray-900">Do'stlarni taklif qiling</h2>
            <p className="mt-1 text-sm text-gray-500">
              Har bir do'stingiz ro'yxatdan o'tganda siz {referrals.rewardPerReferral} kredit olasiz, do'stingiz esa
              qo'shimcha bonus oladi.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <code className="rounded-lg bg-gray-100 px-4 py-2 text-lg font-bold tracking-widest text-indigo-700">
                {referrals.referralCode}
              </code>
              <button
                onClick={copyReferralLink}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Havolani nusxalash
              </button>
            </div>

            <div className="mt-4 flex gap-6 text-sm text-gray-600">
              <span>
                Taklif qilinganlar: <strong>{referrals.referredCount}</strong>
              </span>
              <span>
                Ishlangan kredit: <strong>{referrals.creditsEarned}</strong>
              </span>
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="font-semibold text-gray-900">Parolni o'zgartirish</h2>
          <form onSubmit={savePassword} className="mt-4 space-y-3">
            {passwordError && (
              <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{passwordError}</div>
            )}
            <input
              type="password"
              required
              value={passwords.current}
              onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
              placeholder="Joriy parol"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="password"
              required
              value={passwords.next}
              onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
              placeholder="Yangi parol (kamida 8 belgi)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="password"
              required
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
              placeholder="Yangi parolni tasdiqlang"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={savingPassword}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingPassword ? "O'zgartirilmoqda..." : "Parolni o'zgartirish"}
            </button>
          </form>
        </section>
      </div>
    </Layout>
  );
}
