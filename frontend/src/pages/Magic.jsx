import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { magicApi } from '../api/module.api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, Badge, Spinner } from '../components/ui';

const SUGGESTIONS = [
  'mushuk kosmosda pitsa pishiryapti',
  'Marvel uslubida qisqa video',
  'TikTok uchun reklama roligi musiqa va ovoz bilan',
  'brendim uchun Instagram kampaniyasi',
  'mahsulot uchun reklama rasmi',
];

const PREVIEW_DEBOUNCE_MS = 600;

export default function Magic() {
  const { credits, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [running, setRunning] = useState(false);
  const debounceRef = useRef(null);

  // The plan is previewed as the user types so the cost and the steps are
  // visible *before* any credits are spent.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = prompt.trim();
    if (trimmed.length < 4) {
      setPreview(null);
      setPreviewing(false);
      return undefined;
    }

    setPreviewing(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await magicApi.preview(trimmed);
        setPreview(res.data.data);
      } catch {
        setPreview(null);
      } finally {
        setPreviewing(false);
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [prompt]);

  const run = async () => {
    if (!prompt.trim()) return;

    setRunning(true);
    try {
      const res = await magicApi.run(prompt.trim());
      refreshUser();
      toast.success('Loyiha boshlandi!');
      navigate(`/projects/${res.data.data.projectId}`);
    } catch (err) {
      if (err.response?.status === 402) {
        toast.error('Kredit yetarli emas — kredit sotib oling.');
      } else {
        toast.error(err.response?.data?.error || 'Xatolik yuz berdi.');
      }
      setRunning(false);
    }
  };

  const notEnough = preview && preview.totalCredits > credits;

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <div className="aura text-center">
          <Badge tone="brand">✨ Magic Mode</Badge>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            G'oyangizni ayting
          </h1>
          <p className="mt-2 text-zinc-400">
            AI nima kerakligini o'zi tushunadi, rejalashtiradi va yaratadi.
          </p>
        </div>

        <Card className="mt-8 p-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={500}
            rows={3}
            disabled={running}
            placeholder="masalan: TikTok uchun reklama roligi musiqa va ovoz bilan"
            className="w-full resize-none bg-transparent p-4 text-lg text-white placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
          />
          <div className="flex items-center justify-between gap-3 border-t border-white/6 px-4 py-3">
            <span className="text-xs text-zinc-600">{prompt.length}/500</span>
            <Button onClick={run} disabled={running || !prompt.trim() || notEnough}>
              {running ? <Spinner size="sm" /> : '✨'}
              {running ? 'Boshlanmoqda...' : 'Yaratish'}
            </Button>
          </div>
        </Card>

        {!prompt && (
          <div className="mt-6">
            <p className="mb-3 text-sm text-zinc-500">Namunalar:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setPrompt(suggestion)}
                  className="rounded-full border border-white/10 bg-white/4 px-3.5 py-2 text-sm text-zinc-400 transition-colors hover:border-violet-500/40 hover:text-white"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {previewing && !preview && (
          <div className="mt-8 flex items-center gap-3 text-sm text-zinc-500">
            <Spinner size="sm" />
            AI g'oyangizni tahlil qilmoqda...
          </div>
        )}

        {preview && (
          <Card className="animate-rise mt-8 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-white">AI rejasi</span>
                <Badge tone="brand">{GOAL_LABELS[preview.intent.goal] || preview.intent.goal}</Badge>
                <Badge>{preview.intent.aspectRatio}</Badge>
                {preview.intent.style && preview.intent.style !== 'auto' && (
                  <Badge>{preview.intent.style}</Badge>
                )}
              </div>
              <span className="text-sm text-zinc-400">
                {preview.tasks.length} qadam · ~{Math.ceil(preview.estimatedSeconds / 60)} daq
              </span>
            </div>

            <ol className="divide-y divide-white/5">
              {preview.tasks.map((task) => (
                <li key={task.step} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/6 text-xs text-zinc-400">
                    {task.step}
                  </span>
                  <span className="text-lg">{task.emoji}</span>
                  <span className="flex-1 text-sm text-zinc-200">{task.label}</span>
                  <span className="text-xs text-zinc-500">{task.credits} kr</span>
                </li>
              ))}
            </ol>

            <div className="flex items-center justify-between border-t border-white/6 px-5 py-4">
              <span className="text-sm text-zinc-400">Jami narx</span>
              <span
                className={`text-lg font-semibold ${notEnough ? 'text-red-400' : 'text-white'}`}
              >
                ◆ {preview.totalCredits}
              </span>
            </div>

            {notEnough && (
              <div className="border-t border-white/6 bg-red-500/8 px-5 py-4 text-center">
                <p className="text-sm text-red-300">
                  Kreditingiz yetarli emas ({credits} ta bor, {preview.totalCredits} kerak).
                </p>
                <Button to="/billing" size="sm" className="mt-3">
                  Kredit sotib olish
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </Layout>
  );
}

const GOAL_LABELS = {
  SINGLE: 'Bitta natija',
  ADVERT: 'Reklama kampaniyasi',
  SOCIAL: 'Ijtimoiy tarmoq',
};
