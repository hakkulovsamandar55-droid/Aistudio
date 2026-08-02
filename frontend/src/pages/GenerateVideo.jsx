import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import StylePicker from '../components/StylePicker';
import { generationApi } from '../api/generation.api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, Badge, Spinner, cx } from '../components/ui';

const POLL_INTERVAL_MS = 5000;

export default function GenerateVideo() {
  const { credits, refreshUser } = useAuth();
  const toast = useToast();

  const [prompt, setPrompt] = useState('');
  const [styles, setStyles] = useState([]);
  const [style, setStyle] = useState('auto');
  const [tiers, setTiers] = useState([]);
  const [quality, setQuality] = useState('standard');
  const [submitting, setSubmitting] = useState(false);
  const [generation, setGeneration] = useState(null);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    generationApi
      .getStyles()
      .then((res) => {
        setStyles(res.data.data.video);
        setTiers(res.data.data.videoTiers || []);
      })
      .catch(() => setStyles([]));
  }, []);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    pollRef.current = null;
    timerRef.current = null;
  };

  useEffect(() => stopPolling, []);

  const startPolling = (generationId) => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);

    pollRef.current = setInterval(async () => {
      try {
        const res = await generationApi.getStatus(generationId);
        const updated = res.data.data;
        setGeneration(updated);

        if (updated.status === 'COMPLETED' || updated.status === 'FAILED') {
          stopPolling();
          if (updated.status === 'COMPLETED') {
            refreshUser();
            toast.success('Video tayyor!');
          } else {
            toast.error('Video yaratilmadi — kredit yechilmadi.');
          }
        }
      } catch {
        stopPolling();
        setError('Holatni tekshirishda xatolik yuz berdi.');
      }
    }, POLL_INTERVAL_MS);
  };

  const selectedTier = tiers.find((tier) => tier.id === quality);
  const cost = selectedTier?.credits ?? 20;
  const notEnough = cost > credits;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setSubmitting(true);
    setError('');
    setGeneration(null);

    try {
      const res = await generationApi.generateVideo(prompt.trim(), { style, quality });
      const { generationId, status } = res.data.data;
      setGeneration({ id: generationId, status, userPrompt: prompt.trim() });
      startPolling(generationId);
    } catch (err) {
      if (err.response?.status === 402) {
        toast.error('Kredit yetarli emas.');
      } else {
        setError(err.response?.data?.error || 'Video yaratishda xatolik yuz berdi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    stopPolling();
    setGeneration(null);
    setPrompt('');
    setError('');
  };

  const isProcessing = generation && ['PENDING', 'PROCESSING'].includes(generation.status);

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-white">🎬 Video yaratish</h1>
        <p className="mt-1.5 text-zinc-400">G'oyangizni yozing, sifat darajasini tanlang.</p>

        {!generation && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <Card className="p-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={500}
                rows={4}
                disabled={submitting}
                placeholder="masalan: tog'lar ustidan dron kadri, quyosh botishi"
                className="w-full resize-none bg-transparent p-4 text-white placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
              />
              <div className="px-4 pb-2 text-right text-xs text-zinc-600">{prompt.length}/500</div>
            </Card>

            {tiers.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-zinc-300">Sifat darajasi</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {tiers.map((tier) => {
                    const selected = quality === tier.id;
                    const affordable = tier.credits <= credits;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setQuality(tier.id)}
                        disabled={submitting}
                        className={cx(
                          'rounded-xl border p-3 text-left transition-colors disabled:opacity-50',
                          selected
                            ? 'border-violet-500 bg-violet-500/10'
                            : 'border-white/10 bg-white/4 hover:border-white/20'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-white">{tier.label}</span>
                          <span
                            className={cx(
                              'text-sm',
                              affordable ? 'text-violet-300' : 'text-red-400'
                            )}
                          >
                            ◆ {tier.credits}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-500">{tier.description}</p>
                        <p className="mt-1 text-[11px] text-zinc-600">
                          ~{Math.ceil(tier.estimatedSeconds / 60)} daqiqa
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <StylePicker styles={styles} value={style} onChange={setStyle} disabled={submitting} />

            {error && (
              <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">
                Narx: <span className={notEnough ? 'text-red-400' : 'text-zinc-300'}>◆ {cost}</span>
              </span>
              <Button type="submit" disabled={submitting || !prompt.trim() || notEnough}>
                {submitting ? 'Yuborilmoqda...' : 'Yaratish'}
              </Button>
            </div>

            {notEnough && (
              <p className="text-center text-sm text-red-300">
                Kreditingiz yetarli emas.{' '}
                <a href="/billing" className="underline">
                  Kredit sotib olish
                </a>
              </p>
            )}
          </form>
        )}

        {isProcessing && (
          <Card className="mt-8 flex flex-col items-center gap-3 p-12">
            <Spinner size="lg" />
            <p className="text-center text-zinc-400">
              Video yaratilmoqda, bu bir necha daqiqa vaqt olishi mumkin...
            </p>
            <p className="text-sm text-zinc-600">
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
            </p>
          </Card>
        )}

        {generation?.status === 'COMPLETED' && (
          <div className="mt-8 space-y-4">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={generation.resultUrl} controls className="w-full rounded-2xl" />
            <div className="flex gap-3">
              <Button
                onClick={() =>
                  generationApi
                    .download(generation.id, `ai-studio-${generation.id}.mp4`)
                    .catch(() => toast.error('Yuklab olishda xatolik.'))
                }
                className="flex-1"
              >
                Yuklab olish
              </Button>
              <Button onClick={reset} variant="secondary" className="flex-1">
                Yana yaratish
              </Button>
            </div>
          </div>
        )}

        {generation?.status === 'FAILED' && (
          <Card className="mt-8 p-6 text-center">
            <Badge tone="danger">Xato</Badge>
            <p className="mt-3 text-zinc-300">{generation.errorMessage || "Noma'lum xato"}</p>
            <p className="mt-1 text-sm text-zinc-500">Kredit yechilmadi.</p>
            <Button onClick={reset} variant="secondary" className="mt-5">
              Qaytadan urinish
            </Button>
          </Card>
        )}
      </div>
    </Layout>
  );
}
