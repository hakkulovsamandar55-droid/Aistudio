import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { projectApi } from '../api/module.api';
import { generationApi } from '../api/generation.api';
import { useToast } from '../context/ToastContext';
import { Button, Card, Badge, Spinner, StatusBadge } from '../components/ui';

const POLL_INTERVAL_MS = 3000;

const ROLE_LABELS = {
  strategy: 'Marketing strategiyasi',
  script: 'Ssenariy',
  main: 'Asosiy natija',
  cover: 'Vizual',
  voiceover: 'Diktor ovozi',
  soundtrack: 'Fon musiqasi',
  caption: 'Post matni',
  hashtags: 'Hashtaglar',
};

function AssetBody({ asset }) {
  if (asset.status === 'FAILED') {
    return <p className="text-sm text-red-400">{asset.errorMessage || 'Xatolik yuz berdi'}</p>;
  }

  if (asset.status !== 'COMPLETED') {
    return (
      <div className="flex items-center gap-3 py-6 text-sm text-zinc-500">
        <Spinner size="sm" />
        Yaratilmoqda...
      </div>
    );
  }

  if (asset.resultText) {
    return (
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-4 text-sm leading-relaxed text-zinc-300">
        {asset.resultText}
      </pre>
    );
  }

  if (asset.type === 'IMAGE') {
    return <img src={asset.resultUrl} alt={asset.userPrompt} className="w-full rounded-xl" />;
  }

  if (asset.type === 'VIDEO') {
    // eslint-disable-next-line jsx-a11y/media-has-caption
    return <video src={asset.resultUrl} controls className="w-full rounded-xl" />;
  }

  if (asset.type === 'VOICE' || asset.type === 'MUSIC') {
    // eslint-disable-next-line jsx-a11y/media-has-caption
    return <audio src={asset.resultUrl} controls className="w-full" />;
  }

  return null;
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  const load = useCallback(async () => {
    try {
      const res = await projectApi.get(id);
      setProject(res.data.data);

      // Stop once the orchestrator has settled, so a finished project isn't
      // polled forever.
      if (['COMPLETED', 'PARTIAL', 'FAILED'].includes(res.data.data.status)) {
        stopPolling();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Loyihani yuklab bo'lmadi");
      stopPolling();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, POLL_INTERVAL_MS);
    return stopPolling;
  }, [load]);

  const copyText = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success('Nusxalandi'))
      .catch(() => toast.error("Nusxalab bo'lmadi"));
  };

  const download = async (asset) => {
    try {
      const ext = asset.type === 'VIDEO' ? 'mp4' : asset.type === 'IMAGE' ? 'png' : 'mp3';
      await generationApi.download(asset.id, `ai-studio-${asset.id}.${ext}`);
    } catch {
      toast.error('Yuklab olishda xatolik.');
    }
  };

  const remove = async () => {
    if (!window.confirm("Loyihani o'chirmoqchimisiz?")) return;
    try {
      await projectApi.remove(id);
      toast.success("O'chirildi");
      navigate('/projects');
    } catch {
      toast.error("O'chirishda xatolik.");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Card className="p-10 text-center">
          <p className="text-zinc-400">{error}</p>
          <Button to="/projects" variant="secondary" className="mt-6">
            Loyihalarga qaytish
          </Button>
        </Card>
      </Layout>
    );
  }

  const done = project.generations.filter((asset) => asset.status === 'COMPLETED').length;
  const planned = Array.isArray(project.plan) ? project.plan.length : project.generations.length;
  const progress = planned === 0 ? 0 : Math.round((done / planned) * 100);
  const isRunning = project.status === 'RUNNING' || project.status === 'PLANNING';

  return (
    <Layout>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <button
            onClick={() => navigate('/projects')}
            className="mb-2 text-sm text-zinc-500 transition-colors hover:text-white"
          >
            ← Loyihalar
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{project.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{project.userRequest}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={project.status} />
          <Button onClick={remove} variant="ghost" size="sm">
            O'chirish
          </Button>
        </div>
      </div>

      {isRunning && (
        <Card className="mb-6 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-zinc-300">
              <Spinner size="sm" />
              AI ishlamoqda — {done}/{planned} qadam tayyor
            </span>
            <span className="text-zinc-500">{progress}%</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </Card>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone="brand">{project.goal}</Badge>
        <Badge>◆ {project.creditsUsed} kredit</Badge>
        <Badge>{new Date(project.createdAt).toLocaleString()}</Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {project.generations.map((asset) => (
          <Card key={asset.id} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-white/6 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">
                  {ROLE_LABELS[asset.role] || asset.role || asset.type}
                </span>
                <Badge>{asset.type}</Badge>
              </div>
              <StatusBadge status={asset.status} />
            </div>

            <div className="p-5">
              <AssetBody asset={asset} />

              {asset.status === 'COMPLETED' && (
                <div className="mt-4 flex gap-2">
                  {asset.resultText ? (
                    <Button onClick={() => copyText(asset.resultText)} variant="secondary" size="sm">
                      Nusxalash
                    </Button>
                  ) : (
                    <Button onClick={() => download(asset)} variant="secondary" size="sm">
                      Yuklab olish
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </Layout>
  );
}
