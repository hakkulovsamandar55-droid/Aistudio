import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Icon } from '../components/icons';
import { userApi } from '../api/user.api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, Badge, Spinner, CreditPill, cx } from '../components/ui';

/**
 * The "Profil" tab — the account side of the product. Everything that is not
 * about making something (balance, plan, quota, referrals, settings, admin)
 * is reachable from this one screen.
 */

function Row({ to, onClick, icon, label, hint, tone = 'neutral', last = false }) {
  const inner = (
    <>
      <span
        className={cx(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          tone === 'danger' ? 'bg-[#fbeceb] text-[#a8352a]' : 'bg-[#f4efe6] text-[#5b45e0]'
        )}
      >
        <Icon name={icon} size="md" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cx(
            'block font-medium',
            tone === 'danger' ? 'text-[#a8352a]' : 'text-[#1c1a17]'
          )}
        >
          {label}
        </span>
        {hint && <span className="mt-0.5 block text-sm text-[#a1978a]">{hint}</span>}
      </span>
      <span className="text-[#c3b9a9]">
        <Icon name="chevronRight" size="md" />
      </span>
    </>
  );

  const classes = cx(
    'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#faf7f1]',
    !last && 'border-b border-[#f0eae0]'
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {inner}
    </button>
  );
}

export default function Profile() {
  const { user, credits, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [quota, setQuota] = useState(null);
  const [referrals, setReferrals] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      userApi.getStats().then((res) => setStats(res.data.data)),
      userApi.getQuota().then((res) => setQuota(res.data.data)),
      userApi.getReferrals().then((res) => setReferrals(res.data.data)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyReferral = () => {
    navigator.clipboard
      .writeText(`${window.location.origin}/register?ref=${referrals.referralCode}`)
      .then(() => toast.success('Taklif havolasi nusxalandi'))
      .catch(() => toast.error("Nusxalab bo'lmadi"));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isPro = (quota?.plan || user?.plan) === 'PRO';

  return (
    <Layout>
      <Card className="flex items-center gap-4 p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#5b45e0] text-xl font-semibold text-white">
          {(user?.name || '?').trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-[#1c1a17]">{user?.name}</h1>
          <p className="truncate text-sm text-[#6d655a]">{user?.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={isPro ? 'brand' : 'neutral'} icon={isPro ? 'sparkle' : 'profile'}>
              {isPro ? 'Pro' : 'Bepul'}
            </Badge>
            <CreditPill amount={credits} />
          </div>
        </div>
      </Card>

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {stats && (
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[
            { label: 'Ishlar', value: stats.totalGenerations },
            { label: 'Sevimli', value: stats.favorites },
            { label: 'Ulashilgan', value: stats.shared },
            { label: 'Sarflangan', value: stats.creditsSpent },
          ].map((card) => (
            <Card key={card.label} className="p-3 text-center">
              <p className="text-lg font-semibold text-[#1c1a17]">{card.value}</p>
              <p className="mt-0.5 text-[11px] text-[#a1978a]">{card.label}</p>
            </Card>
          ))}
        </div>
      )}

      {quota && !quota.unlimited && (
        <Card className="mt-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-medium text-[#1c1a17]">Bugungi limit</h2>
              <p className="mt-0.5 text-sm text-[#6d655a]">Bepul tarifda kunlik cheklov bor.</p>
            </div>
            <Button to="/billing" size="sm" variant="soft" icon="sparkle">
              Pro
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {Object.entries(quota.modules).map(([moduleId, info]) => {
              const used = Math.min(info.used, info.limit);
              const pct = info.limit ? (used / info.limit) * 100 : 0;
              return (
                <div key={moduleId}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-[#37322b]">{MODULE_LABELS[moduleId] || moduleId}</span>
                    <span className="text-[#a1978a]">
                      {info.used} / {info.limit}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#f0eae0]">
                    <div
                      className={cx(
                        'h-full rounded-full transition-all',
                        pct >= 100 ? 'bg-[#e07a3f]' : 'bg-[#5b45e0]'
                      )}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {referrals && (
        <Card className="mt-4 p-5">
          <h2 className="font-medium text-[#1c1a17]">Do'stlarni taklif qiling</h2>
          <p className="mt-0.5 text-sm text-[#6d655a]">
            Har bir do'st uchun {referrals.rewardPerReferral} kredit olasiz.
          </p>
          <div className="mt-3.5 flex items-center gap-2">
            <code className="flex-1 rounded-xl bg-[#f4efe6] px-4 py-2.5 text-center font-mono text-sm font-semibold tracking-[0.2em] text-[#4733c4]">
              {referrals.referralCode}
            </code>
            <Button onClick={copyReferral} variant="secondary" icon="copy">
              Nusxa
            </Button>
          </div>
          <p className="mt-3 text-sm text-[#a1978a]">
            Taklif qilingan: <strong className="text-[#37322b]">{referrals.referredCount}</strong> ·
            Ishlangan: <strong className="text-[#37322b]">{referrals.creditsEarned}</strong> kredit
          </p>
        </Card>
      )}

      <Card className="mt-4 overflow-hidden p-0">
        <Row to="/billing" icon="card" label="Kredit sotib olish" hint={`Balans: ${credits}`} />
        <Row to="/library?view=gallery" icon="gallery" label="Galereya" hint="Hamjamiyat ishlari" />
        <Row
          to="/settings"
          icon="settings"
          label="Sozlamalar"
          hint="Ism va parolni o'zgartirish"
          last={user?.role !== 'ADMIN'}
        />
        {user?.role === 'ADMIN' && (
          <Row to="/admin" icon="shield" label="Admin panel" hint="Boshqaruv" last />
        )}
      </Card>

      <Card className="mt-4 overflow-hidden p-0">
        <Row onClick={handleLogout} icon="logout" label="Chiqish" tone="danger" last />
      </Card>

      <p className="mt-6 text-center text-xs text-[#c3b9a9]">AI Studio · Say your idea. AI does the rest.</p>
    </Layout>
  );
}

const MODULE_LABELS = {
  IMAGE: 'Rasm',
  VIDEO: 'Video',
  VOICE: 'Ovoz',
  MUSIC: 'Musiqa',
  SCRIPT: 'Matn',
};
