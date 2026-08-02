import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import StylePicker from '../components/StylePicker';
import { generationApi } from '../api/generation.api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Icon } from '../components/icons';
import { Button, Card, Badge, Spinner, CreditPill, Segmented, cx } from '../components/ui';

/**
 * The "buyurtma berish" flow: idea -> enhance (free) -> media type + settings
 * -> generate. Three steps in one component (not three routes) so the
 * prompt and its edits never have to round-trip through the URL or get lost
 * on a back button.
 *
 * Reachable two ways: Dashboard's central input (arrives with a prompt
 * already in router state) and the Create hub's "Video" card (arrives
 * empty, starts at the idea step).
 */

const POLL_INTERVAL_MS = 5000;
const ENHANCE_WORD_THRESHOLD = 15;
const DURATION_PRESETS = [3, 5, 10];

// Purely a display label — the priced, authoritative tier data (credits,
// maxDuration, provider) always comes from the backend's /generate/styles
// response, never hardcoded here.
const TIER_RESOLUTION = { low: '480p', standard: '720p', better: '2K', ultra: '4K' };
const TIER_PREMIUM = { better: 'gold', ultra: 'diamond' };

const MEDIA_TYPES = [
  { value: 'VIDEO', label: 'Video', icon: 'video' },
  { value: 'IMAGE', label: 'Rasm', icon: 'image' },
  { value: 'VOICE', label: 'Ovoz', icon: 'voice' },
];

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function GenerateVideo() {
  const { credits, refreshUser } = useAuth();
  const toast = useToast();
  const location = useLocation();

  const [step, setStep] = useState('idea');

  // --- idea step ----------------------------------------------------------
  const [prompt, setPrompt] = useState(location.state?.prompt || '');
  const [enhancing, setEnhancing] = useState(false);
  const [enhanced, setEnhanced] = useState(false);
  const [originalPrompt, setOriginalPrompt] = useState(null);

  // --- settings step --------------------------------------------------------
  const [mediaType, setMediaType] = useState('VIDEO');
  const [imageStyles, setImageStyles] = useState([]);
  const [videoStyles, setVideoStyles] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [costs, setCosts] = useState({});
  const [style, setStyle] = useState('auto');
  const [quality, setQuality] = useState('standard');
  const [duration, setDuration] = useState(5);
  const [customDuration, setCustomDuration] = useState(false);

  // --- submit / result -------------------------------------------------------
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [generation, setGeneration] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    generationApi
      .getStyles()
      .then((res) => {
        setImageStyles(res.data.data.image);
        setVideoStyles(res.data.data.video);
        setCosts(res.data.data.costs || {});
        setTiers(res.data.data.videoTiers || []);
      })
      .catch(() => {});
  }, []);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    pollRef.current = null;
    timerRef.current = null;
  };
  useEffect(() => stopPolling, []);

  const selectedTier = tiers.find((tier) => tier.id === quality);

  // Changing tier can invalidate a longer duration already picked — clamp it
  // down rather than letting an unaffordable combination reach "Yaratish".
  useEffect(() => {
    if (selectedTier && duration > selectedTier.maxDuration) {
      setDuration(selectedTier.maxDuration);
    }
  }, [selectedTier, duration]);

  const short = prompt.trim() && wordCount(prompt) < ENHANCE_WORD_THRESHOLD;

  const handleEnhance = async () => {
    if (!prompt.trim() || enhancing) return;
    setEnhancing(true);
    try {
      const res = await generationApi.enhance(prompt.trim(), mediaType === 'IMAGE' ? 'IMAGE' : 'VIDEO');
      if (originalPrompt === null) setOriginalPrompt(prompt);
      setPrompt(res.data.data.enhancedPrompt);
      setEnhanced(true);
    } catch {
      toast.error('Promptni yaxshilashda xatolik yuz berdi.');
    } finally {
      setEnhancing(false);
    }
  };

  const revertPrompt = () => {
    if (originalPrompt === null) return;
    setPrompt(originalPrompt);
    setOriginalPrompt(null);
    setEnhanced(false);
  };

  const goToSettings = () => {
    if (!prompt.trim()) return;
    setStep('settings');
  };

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

  const cost = mediaType === 'VIDEO' ? selectedTier?.credits ?? 20 : costs.IMAGE ?? 2;
  const notEnough = cost > credits;

  const handleGenerate = async () => {
    if (!prompt.trim() || notEnough) return;
    setSubmitting(true);
    setError('');

    try {
      if (mediaType === 'IMAGE') {
        const res = await generationApi.generateImage(prompt.trim(), { style });
        setGeneration(res.data.data);
        refreshUser();
        setStep('result');
      } else {
        const res = await generationApi.generateVideo(prompt.trim(), { style, quality, duration });
        const { generationId, status } = res.data.data;
        setGeneration({ id: generationId, status, type: 'VIDEO', userPrompt: prompt.trim() });
        setStep('result');
        startPolling(generationId);
      }
    } catch (err) {
      if (err.response?.status === 402) {
        toast.error('Kredit yetarli emas.');
      } else if (err.response?.status === 429) {
        toast.error(err.response.data.error);
      } else {
        setError(err.response?.data?.error || 'Yaratishda xatolik yuz berdi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    stopPolling();
    setStep('idea');
    setPrompt('');
    setOriginalPrompt(null);
    setEnhanced(false);
    setGeneration(null);
    setError('');
  };

  const isProcessing = generation && ['PENDING', 'PROCESSING'].includes(generation.status);

  return (
    <Layout title="Video buyurtma qilish" back="/create">
      {step === 'idea' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#1c1a17]">G'oyangizni yozing</h1>
            <p className="mt-1 text-sm text-[#6d655a]">Qanday video yaratmoqchisiz?</p>
          </div>

          <Card className="overflow-hidden p-0">
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (enhanced) setEnhanced(false);
              }}
              maxLength={500}
              rows={5}
              placeholder="masalan: tog'lar ustidan dron kadri, quyosh botishi"
              className="w-full resize-none bg-transparent p-4 text-[#1c1a17] placeholder:text-[#a1978a] focus:outline-none"
            />
            <div className="flex items-center justify-between border-t border-[#f0eae0] bg-[#faf7f1] px-4 py-2.5">
              <span className="text-xs text-[#a1978a]">{prompt.length}/500</span>
              {enhanced && (
                <button
                  onClick={revertPrompt}
                  className="inline-flex items-center gap-1 text-xs text-[#a1978a] hover:text-[#6d655a]"
                >
                  <Icon name="refresh" size="xs" />
                  Asl matnga qaytarish
                </button>
              )}
            </div>
          </Card>

          <button
            onClick={handleEnhance}
            disabled={!prompt.trim() || enhancing}
            className={cx(
              'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all disabled:opacity-50',
              short
                ? 'bg-[#efecff] text-[#4733c4] ring-2 ring-[#5b45e0]/30 shadow-[0_0_0_4px_rgba(91,69,224,0.08)]'
                : 'bg-white text-[#6d655a] ring-1 ring-[#e8e0d3] hover:ring-[#d8cdba]'
            )}
          >
            {enhancing ? (
              <Spinner size="sm" />
            ) : (
              <Icon name="sparkle" size="sm" />
            )}
            {enhancing ? 'Yaxshilanmoqda...' : 'Promptni professional qil'}
            {short && !enhancing && (
              <Badge tone="brand" className="ml-1">
                Tavsiya
              </Badge>
            )}
          </button>

          <Button onClick={goToSettings} disabled={!prompt.trim()} className="w-full" icon="arrowRight">
            Davom etish
          </Button>
        </div>
      )}

      {step === 'settings' && (
        <div className="space-y-6">
          <button
            onClick={() => setStep('idea')}
            className="inline-flex items-center gap-1 text-sm text-[#6d655a] hover:text-[#1c1a17]"
          >
            <Icon name="chevronLeft" size="sm" />
            G'oyani tahrirlash
          </button>

          <Card className="p-4">
            <p className="line-clamp-3 text-sm text-[#37322b]">{prompt}</p>
          </Card>

          <Segmented options={MEDIA_TYPES} value={mediaType} onChange={setMediaType} className="w-full" />

          {mediaType === 'VIDEO' && (
            <>
              <div>
                <p className="mb-2.5 text-sm font-medium text-[#37322b]">Sifat darajasi</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {tiers.map((tier) => {
                    const selected = quality === tier.id;
                    const affordable = tier.credits <= credits;
                    const premium = TIER_PREMIUM[tier.id];
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setQuality(tier.id)}
                        className={cx(
                          'relative overflow-hidden rounded-xl border p-3.5 text-left transition-all',
                          premium === 'gold'
                            ? 'border-[#e0b84a] bg-[#fdf8ec] hover:border-[#cda23a]'
                            : premium === 'diamond'
                              ? 'border-[#8b5cf6] bg-gradient-to-br from-[#f3effe] to-[#eef0ff] hover:border-[#7c4fe0]'
                              : selected
                                ? 'border-[#5b45e0] bg-[#efecff]'
                                : 'border-[#e8e0d3] bg-white hover:border-[#d8cdba]',
                          // Premium cards keep their gold/diamond identity even when picked —
                          // a ring on top says "selected" without erasing why it costs more.
                          selected && 'ring-2 ring-offset-1 ring-[#5b45e0]/50'
                        )}
                      >
                        {premium && <span className="shimmer" style={{ position: 'absolute', inset: 0 }} />}
                        <div className="relative flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 font-semibold text-[#1c1a17]">
                            {TIER_RESOLUTION[tier.id] || tier.label}
                            {premium === 'gold' && <Icon name="star" size="xs" className="text-[#c9962f]" />}
                            {premium === 'diamond' && <Icon name="sparkle" size="xs" className="text-[#7c4fe0]" />}
                          </span>
                          <CreditPill amount={tier.credits} tone={affordable ? 'brand' : 'danger'} />
                        </div>
                        <p className="relative mt-1 text-xs text-[#6d655a]">{tier.label} · {tier.description}</p>
                        <p className="relative mt-1 text-[11px] text-[#a1978a]">
                          ~{Math.ceil(tier.estimatedSeconds / 60)} daqiqada tayyor · {tier.maxDuration}s gacha
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2.5 text-sm font-medium text-[#37322b]">Davomiyligi</p>
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.filter((preset) => !selectedTier || preset <= selectedTier.maxDuration).map(
                    (preset) => (
                      <button
                        key={preset}
                        onClick={() => {
                          setCustomDuration(false);
                          setDuration(preset);
                        }}
                        className={cx(
                          'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                          !customDuration && duration === preset
                            ? 'border-[#5b45e0] bg-[#efecff] text-[#4733c4]'
                            : 'border-[#e8e0d3] bg-white text-[#6d655a] hover:border-[#d8cdba]'
                        )}
                      >
                        {preset}s
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setCustomDuration(true)}
                    className={cx(
                      'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                      customDuration
                        ? 'border-[#5b45e0] bg-[#efecff] text-[#4733c4]'
                        : 'border-[#e8e0d3] bg-white text-[#6d655a] hover:border-[#d8cdba]'
                    )}
                  >
                    Boshqa
                  </button>
                </div>
                {customDuration && selectedTier && (
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={selectedTier.maxDuration}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full accent-[#5b45e0]"
                    />
                    <span className="w-12 shrink-0 text-right text-sm font-medium text-[#1c1a17]">{duration}s</span>
                  </div>
                )}
              </div>

              <StylePicker styles={videoStyles} value={style} onChange={setStyle} disabled={submitting} />
            </>
          )}

          {mediaType === 'IMAGE' && (
            <StylePicker styles={imageStyles} value={style} onChange={setStyle} disabled={submitting} />
          )}

          {mediaType === 'VOICE' && (
            <Card className="flex flex-col items-center gap-2 p-8 text-center">
              <Icon name="voice" size="xl" className="text-[#a1978a]" />
              <p className="text-sm text-[#6d655a]">Ovoz generatsiyasi tez orada qo'shiladi.</p>
            </Card>
          )}

          {error && <div className="rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-[#a8352a]">{error}</div>}

          {mediaType !== 'VOICE' && (
            <>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-[#6d655a]">
                  Jami narx
                  <CreditPill amount={cost} tone={notEnough ? 'danger' : 'neutral'} />
                </span>
                <Button onClick={handleGenerate} disabled={submitting || notEnough} icon="magic">
                  {submitting ? 'Yuborilmoqda...' : 'Yaratish'}
                </Button>
              </div>

              {notEnough && (
                <p className="text-center text-sm text-[#a8352a]">
                  Kreditingiz yetarli emas.{' '}
                  <a href="/billing" className="font-medium underline">
                    Kredit sotib olish
                  </a>
                </p>
              )}
            </>
          )}
        </div>
      )}

      {step === 'result' && (
        <div className="space-y-4">
          {isProcessing && (
            <Card className="flex flex-col items-center gap-3 p-14">
              <Spinner size="lg" />
              <p className="text-center text-[#6d655a]">
                Video yaratilmoqda, bu bir necha daqiqa vaqt olishi mumkin...
              </p>
              <p className="font-mono text-sm text-[#a1978a]">
                {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
              </p>
            </Card>
          )}

          {generation?.status === 'COMPLETED' && generation.type === 'VIDEO' && (
            <>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={generation.resultUrl} controls className="w-full rounded-2xl bg-[#f4efe6]" />
              <div className="flex gap-3">
                <Button
                  icon="download"
                  className="flex-1"
                  onClick={() =>
                    generationApi
                      .download(generation.id, `ai-studio-${generation.id}.mp4`)
                      .catch(() => toast.error('Yuklab olishda xatolik.'))
                  }
                >
                  Yuklab olish
                </Button>
                <Button onClick={reset} variant="secondary" className="flex-1" icon="refresh">
                  Yana yaratish
                </Button>
              </div>
            </>
          )}

          {generation?.status === 'COMPLETED' && generation.type !== 'VIDEO' && (
            <>
              <img
                src={generation.resultUrl}
                alt={generation.userPrompt}
                className="w-full rounded-2xl bg-[#f4efe6]"
              />
              <div className="flex gap-3">
                <Button
                  icon="download"
                  className="flex-1"
                  onClick={() =>
                    generationApi
                      .download(generation.id, `ai-studio-${generation.id}.png`)
                      .catch(() => toast.error('Yuklab olishda xatolik.'))
                  }
                >
                  Yuklab olish
                </Button>
                <Button onClick={reset} variant="secondary" className="flex-1" icon="refresh">
                  Yana yaratish
                </Button>
              </div>
            </>
          )}

          {generation?.status === 'FAILED' && (
            <Card className="p-6 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fbeceb] text-[#a8352a]">
                <Icon name="alert" size="lg" />
              </span>
              <Badge tone="danger" className="mt-3">
                Xato
              </Badge>
              <p className="mt-3 text-[#37322b]">{generation.errorMessage || "Noma'lum xato"}</p>
              <p className="mt-1 text-sm text-[#a1978a]">Kredit yechilmadi.</p>
              <Button onClick={reset} variant="secondary" className="mt-5" icon="refresh">
                Qaytadan urinish
              </Button>
            </Card>
          )}
        </div>
      )}
    </Layout>
  );
}
