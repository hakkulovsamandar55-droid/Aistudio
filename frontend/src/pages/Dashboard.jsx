import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import AnnouncementBanner from '../components/AnnouncementBanner';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { userApi } from '../api/user.api';
import { projectApi } from '../api/module.api';
import { Button, Card, Badge, Spinner, EmptyState, StatusBadge } from '../components/ui';

export default function Dashboard() {
  const { user, credits, refreshUser } = useAuth();
  const toast = useToast();

  const [recent, setRecent] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [referrals, setReferrals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    Promise.all([
      userApi.getGenerations(1, 6).then((res) => setRecent(res.data.data)),
      projectApi.list(1, 3).then((res) => setProjects(res.data.data)),
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

  const copyReferral = () => {
    navigator.clipboard
      .writeText(`${window.location.origin}/register?ref=${referrals.referralCode}`)
      .then(() => toast.success('Taklif havolasi nusxalandi'))
      .catch(() => toast.error("Nusxalab bo'lmadi"));
  };

  return (
    <Layout>
      <AnnouncementBanner />

      <div className="mb-8 mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Salom, {user?.name}
        </h1>
        <p className="mt-1.5 text-zinc-400">
          Balansingiz <span className="font-medium text-violet-300">◆ {credits} kredit</span>
        </p>
      </div>

      {user?.dailyBonus?.available && (
        <button
          onClick={claimBonus}
          disabled={claiming}
          className="mb-6 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/90 to-orange-600/90 p-5 text-left transition-transform hover:scale-[1.005] disabled:opacity-60"
        >
          <span className="text-lg font-semibold text-white">🎁 Kunlik bonus tayyor</span>
          <p className="mt-0.5 text-sm text-amber-50/90">
            {claiming ? 'Olinmoqda...' : `Bosing va ${user.dailyBonus.amount} ta bepul kredit oling`}
          </p>
        </button>
      )}

      {/* Magic Mode is the headline path, so it gets the biggest target. */}
      <Link to="/magic" className="block">
        <Card hover className="aura group relative overflow-hidden p-8">
          <Badge tone="brand">✨ Magic Mode</Badge>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            G'oyangizni ayting — qolganini AI bajaradi
          </h2>
          <p className="mt-2 max-w-lg text-zinc-400">
            Bitta jumla yozing. AI nima kerakligini tushunadi, rejalashtiradi va barcha kerakli
            kontentni yaratadi.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-violet-300 transition-transform group-hover:translate-x-1">
            Boshlash →
          </span>
        </Card>
      </Link>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Link to="/generate/image">
          <Card hover className="flex h-full items-center gap-4 p-5">
            <span className="text-3xl">🖼️</span>
            <div>
              <h3 className="font-medium text-white">Rasm yaratish</h3>
              <p className="text-sm text-zinc-500">Uslub tanlab, aniq natija</p>
            </div>
          </Card>
        </Link>
        <Link to="/generate/video">
          <Card hover className="flex h-full items-center gap-4 p-5">
            <span className="text-3xl">🎬</span>
            <div>
              <h3 className="font-medium text-white">Video yaratish</h3>
              <p className="text-sm text-zinc-500">Sifat darajasini o'zingiz tanlang</p>
            </div>
          </Card>
        </Link>
      </div>

      {stats && stats.totalGenerations > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Jami', value: stats.totalGenerations },
            { label: 'Rasmlar', value: stats.byType.IMAGE || 0 },
            { label: 'Videolar', value: stats.byType.VIDEO || 0 },
            { label: 'Sevimlilar', value: stats.favorites },
          ].map((card) => (
            <Card key={card.label} className="p-4 text-center">
              <p className="text-xl font-semibold text-white">{card.value}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{card.label}</p>
            </Card>
          ))}
        </div>
      )}

      {referrals && (
        <Card className="mt-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-white">Do'stlarni taklif qiling</h3>
              <p className="mt-0.5 text-sm text-zinc-500">
                Har bir do'st uchun {referrals.rewardPerReferral} kredit · taklif qilingan{' '}
                <strong className="text-zinc-300">{referrals.referredCount}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="rounded-lg bg-black/40 px-3 py-2 font-mono text-sm tracking-widest text-violet-300">
                {referrals.referralCode}
              </code>
              <Button onClick={copyReferral} variant="secondary" size="sm">
                Nusxalash
              </Button>
            </div>
          </div>
        </Card>
      )}

      {projects.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium text-white">So'nggi loyihalar</h2>
            <Link to="/projects" className="text-sm text-violet-400 hover:underline">
              Barchasi →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} to={`/projects/${project.id}`}>
                <Card hover className="h-full p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                      {project.title}
                    </h3>
                    <StatusBadge status={project.status} />
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">{project.generations.length} aktiv</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium text-white">So'nggi ishlar</h2>
          <Link to="/history" className="text-sm text-violet-400 hover:underline">
            Tarix →
          </Link>
        </div>

        {loading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {!loading && recent.length === 0 && (
          <EmptyState
            title="Hali hech narsa yaratmadingiz"
            description="Magic Mode'da bitta jumla yozib boshlang."
            action={<Button to="/magic">✨ Magic Mode</Button>}
          />
        )}

        {!loading && recent.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {recent.map((gen) => (
              <Card key={gen.id} hover className="overflow-hidden">
                <div className="flex aspect-square items-center justify-center bg-black/30">
                  {gen.resultUrl && gen.type === 'IMAGE' ? (
                    <img src={gen.resultUrl} alt={gen.userPrompt} className="h-full w-full object-cover" />
                  ) : gen.resultUrl && gen.type === 'VIDEO' ? (
                    <video src={gen.resultUrl} className="h-full w-full object-cover" muted />
                  ) : (
                    <span className="text-2xl">{gen.type === 'IMAGE' ? '🖼️' : '🎬'}</span>
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs text-zinc-400">{gen.userPrompt}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
