import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Icon } from '../components/icons';
import { magicApi } from '../api/module.api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, Badge, Spinner, CreditPill, cx } from '../components/ui';

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
    <Layout title="Magic Mode" back="/create">
      <div className="aura text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5b45e0] text-white">
          <Icon name="magic" size="xl" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#1c1a17]">
          G'oyangizni ayting
        </h1>
        <p className="mt-1.5 text-[#6d655a]">
          AI nima kerakligini o'zi tushunadi, rejalashtiradi va yaratadi.
        </p>
      </div>

      <Card className="mt-7 overflow-hidden p-0">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={500}
          rows={3}
          disabled={running}
          placeholder="masalan: TikTok uchun reklama roligi musiqa va ovoz bilan"
          className="w-full resize-none bg-transparent p-4 text-[#1c1a17] placeholder:text-[#a1978a] focus:outline-none disabled:opacity-50"
        />
        <div className="flex items-center justify-between gap-3 border-t border-[#f0eae0] bg-[#faf7f1] px-4 py-3">
          <span className="text-xs text-[#a1978a]">{prompt.length}/500</span>
          <Button onClick={run} disabled={running || !prompt.trim() || notEnough}>
            {running ? <Spinner size="sm" /> : <Icon name="magic" size="sm" />}
            {running ? 'Boshlanmoqda...' : 'Yaratish'}
          </Button>
        </div>
      </Card>

      {!prompt && (
        <div className="mt-6">
          <p className="mb-2.5 text-sm font-medium text-[#6d655a]">Namunalar</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setPrompt(suggestion)}
                className="rounded-full border border-[#e8e0d3] bg-white px-3.5 py-2 text-sm text-[#6d655a] transition-colors hover:border-[#5b45e0] hover:text-[#1c1a17]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {previewing && !preview && (
        <div className="mt-7 flex items-center gap-3 text-sm text-[#6d655a]">
          <Spinner size="sm" />
          AI g'oyangizni tahlil qilmoqda...
        </div>
      )}

      {preview && (
        <Card className="animate-rise mt-7 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0eae0] px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-[#1c1a17]">AI rejasi</span>
              <Badge tone="brand">{GOAL_LABELS[preview.intent.goal] || preview.intent.goal}</Badge>
              <Badge>{preview.intent.aspectRatio}</Badge>
            </div>
            <span className="text-sm text-[#a1978a]">
              {preview.tasks.length} qadam · ~{Math.ceil(preview.estimatedSeconds / 60)} daq
            </span>
          </div>

          <ol className="divide-y divide-[#f0eae0]">
            {preview.tasks.map((task) => (
              <li key={task.step} className="flex items-center gap-3 px-5 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f4efe6] text-xs font-medium text-[#6d655a]">
                  {task.step}
                </span>
                <span className="text-[#5b45e0]">
                  <Icon name={task.icon || 'sparkle'} size="md" />
                </span>
                <span className="flex-1 text-sm text-[#37322b]">{task.label}</span>
                <span className="text-xs text-[#a1978a]">{task.credits} kr</span>
              </li>
            ))}
          </ol>

          <div className="flex items-center justify-between border-t border-[#f0eae0] bg-[#faf7f1] px-5 py-4">
            <span className="text-sm text-[#6d655a]">Jami narx</span>
            <CreditPill amount={preview.totalCredits} tone={notEnough ? 'danger' : 'brand'} />
          </div>

          {notEnough && (
            <div className={cx('border-t border-[#f3d2cf] bg-[#fbeceb] px-5 py-4 text-center')}>
              <p className="text-sm text-[#a8352a]">
                Kreditingiz yetarli emas ({credits} ta bor, {preview.totalCredits} kerak).
              </p>
              <Button to="/billing" size="sm" className="mt-3" icon="card">
                Kredit sotib olish
              </Button>
            </div>
          )}
        </Card>
      )}
    </Layout>
  );
}

const GOAL_LABELS = {
  SINGLE: 'Bitta natija',
  ADVERT: 'Reklama kampaniyasi',
  SOCIAL: 'Ijtimoiy tarmoq',
};
