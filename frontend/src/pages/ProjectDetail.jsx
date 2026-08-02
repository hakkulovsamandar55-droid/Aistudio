import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { projectApi } from '../api/module.api';
import { generationApi } from '../api/generation.api';
import { useToast } from '../context/ToastContext';
import { Icon } from '../components/icons';
import { Button, Card, Badge, Spinner, StatusBadge, CreditPill } from '../components/ui';

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
    return (
      <p className="rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-[#a8352a]">
        {asset.errorMessage || 'Xatolik yuz berdi'}
      </p>
    );
  }

  if (asset.status !== 'COMPLETED') {
    return (
      <div className="flex items-center gap-3 py-6 text-sm text-[#6d655a]">
        <Spinner size="sm" />
        Yaratilmoqda...
      </div>
    );
  }

  if (asset.resultText) {
    return (
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-[#faf7f1] p-4 font-sans text-sm leading-relaxed text-[#37322b]">
        {asset.resultText}
      </pre>
    );
  }

  if (asset.type === 'IMAGE') {
    return (
      <img src={asset.resultUrl} alt={asset.userPrompt} className="w-full rounded-xl bg-[#f4efe6]" />
    );
  }

  if (asset.type === 'VIDEO') {
    // eslint-disable-next-line jsx-a11y/media-has-caption
    return <video src={asset.resultUrl} controls className="w-full rounded-xl bg-[#f4efe6]" />;
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
      navigate('/library');
    } catch {
      toast.error("O'chirishda xatolik.");
    }
  };

  if (loading) {
    return (
      <Layout title="Loyiha" back="/library">
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Loyiha" back="/library">
        <Card className="p-10 text-center">
          <p className="text-[#6d655a]">{error}</p>
          <Button to="/library" variant="secondary" className="mt-6">
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
    <Layout
      title={project.title}
      back="/library"
      action={
        <Button onClick={remove} variant="ghost" size="sm" icon="trash">
          <span className="sr-only">O'chirish</span>
        </Button>
      }
    >
      <div className="mb-5">
        <p className="text-sm text-[#6d655a]">{project.userRequest}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={project.status} />
          <Badge tone="brand">{project.goal}</Badge>
          <CreditPill amount={project.creditsUsed} tone="neutral" />
        </div>
      </div>

      {isRunning && (
        <Card className="mb-5 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-[#37322b]">
              <Spinner size="sm" />
              AI ishlamoqda — {done}/{planned} qadam tayyor
            </span>
            <span className="text-[#a1978a]">{progress}%</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f0eae0]">
            <div
              className="h-full rounded-full bg-[#5b45e0] transition-all duration-500"
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {project.generations.map((asset) => (
          <Card key={asset.id} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-[#f0eae0] px-5 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-[#5b45e0]">
                  <Icon name={ASSET_ICONS[asset.type] || 'sparkle'} size="sm" />
                </span>
                <span className="truncate font-medium text-[#1c1a17]">
                  {ROLE_LABELS[asset.role] || asset.role || asset.type}
                </span>
              </div>
              <StatusBadge status={asset.status} />
            </div>

            <div className="p-5">
              <AssetBody asset={asset} />

              {asset.status === 'COMPLETED' && (
                <div className="mt-4 flex gap-2">
                  {asset.resultText ? (
                    <Button
                      onClick={() => copyText(asset.resultText)}
                      variant="secondary"
                      size="sm"
                      icon="copy"
                    >
                      Nusxalash
                    </Button>
                  ) : (
                    <Button
                      onClick={() => download(asset)}
                      variant="secondary"
                      size="sm"
                      icon="download"
                    >
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

const ASSET_ICONS = {
  IMAGE: 'image',
  VIDEO: 'video',
  VOICE: 'voice',
  MUSIC: 'music',
  SCRIPT: 'script',
};
