import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import AnnouncementBanner from '../components/AnnouncementBanner';
import MediaThumb from '../components/MediaThumb';
import { Icon } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { userApi } from '../api/user.api';
import { projectApi } from '../api/module.api';
import { Button, Card, Badge, Spinner, EmptyState, StatusBadge } from '../components/ui';

const QUICK_TOOLS = [
  { to: '/generate/image', icon: 'image', label: 'Rasm' },
  { to: '/generate/video', icon: 'video', label: 'Video' },
  { to: '/remix', icon: 'remix', label: 'Remix' },
];

export default function Dashboard() {
  const { user, credits, refreshUser } = useAuth();
  const toast = useToast();

  const [recent, setRecent] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    Promise.all([
      userApi.getGenerations(1, 6).then((res) => setRecent(res.data.data)),
      projectApi.list(1, 2).then((res) => setProjects(res.data.data)),
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

  return (
    <Layout>
      <AnnouncementBanner />

      <div className="mt-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1c1a17]">
          Salom, {user?.name}
        </h1>
        <p className="mt-1 text-[#6d655a]">Bugun nima yaratamiz?</p>
      </div>

      {user?.dailyBonus?.available && (
        <button
          onClick={claimBonus}
          disabled={claiming}
          className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-[#f2e0bd] bg-[#fdf3e3] p-4 text-left transition-colors hover:bg-[#fbedd6] disabled:opacity-60"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e07a3f] text-white">
            <Icon name="gift" size="md" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-[#1c1a17]">Kunlik bonus tayyor</span>
            <span className="mt-0.5 block text-sm text-[#95601a]">
              {claiming ? 'Olinmoqda...' : `Bosing va ${user.dailyBonus.amount} ta bepul kredit oling`}
            </span>
          </span>
          <span className="text-[#c9a05e]">
            <Icon name="chevronRight" size="md" />
          </span>
        </button>
      )}

      <Link to="/magic" className="mt-5 block">
        <Card hover className="aura group overflow-hidden p-6">
          <Badge tone="brand" icon="magic">
            Magic Mode
          </Badge>
          <h2 className="mt-3.5 text-xl font-semibold tracking-tight text-[#1c1a17]">
            G'oyangizni ayting — qolganini AI bajaradi
          </h2>
          <p className="mt-1.5 text-sm text-[#6d655a]">
            Bitta jumla yozing. AI nima kerakligini tushunadi, rejalashtiradi va yaratadi.
          </p>
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#5b45e0] transition-transform group-hover:translate-x-0.5">
            Boshlash
            <Icon name="arrowRight" size="sm" />
          </span>
        </Card>
      </Link>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {QUICK_TOOLS.map((tool) => (
          <Link key={tool.to} to={tool.to}>
            <Card hover className="flex h-full flex-col items-center gap-2 p-4 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4efe6] text-[#5b45e0]">
                <Icon name={tool.icon} size="md" />
              </span>
              <span className="text-sm font-medium text-[#1c1a17]">{tool.label}</span>
            </Card>
          </Link>
        ))}
      </div>

      {projects.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-[#1c1a17]">So'nggi loyihalar</h2>
            <Link
              to="/library"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#5b45e0] hover:underline"
            >
              Barchasi
              <Icon name="chevronRight" size="xs" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((project) => (
              <Link key={project.id} to={`/projects/${project.id}`}>
                <Card hover className="flex h-full items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#efecff] text-[#5b45e0]">
                    <Icon name="projects" size="md" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[#1c1a17]">
                      {project.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#a1978a]">
                      {project.generations.length} aktiv
                    </span>
                  </span>
                  <StatusBadge status={project.status} />
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-[#1c1a17]">So'nggi ishlar</h2>
          <Link
            to="/library?view=history"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#5b45e0] hover:underline"
          >
            Tarix
            <Icon name="chevronRight" size="xs" />
          </Link>
        </div>

        {loading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {!loading && recent.length === 0 && (
          <EmptyState
            icon="sparkle"
            title="Hali hech narsa yaratmadingiz"
            description="Magic Mode'da bitta jumla yozib boshlang."
            action={
              <Button to="/magic" icon="magic">
                Magic Mode
              </Button>
            }
          />
        )}

        {!loading && recent.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {recent.map((gen) => (
              <Link key={gen.id} to="/library?view=history">
                <Card hover className="overflow-hidden">
                  <MediaThumb generation={gen} />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
