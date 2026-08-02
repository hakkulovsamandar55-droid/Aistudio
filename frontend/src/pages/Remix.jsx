import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { remixApi } from '../api/remix.api';
import { generationApi } from '../api/generation.api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, Badge, Spinner, cx } from '../components/ui';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function Remix() {
  const { credits, refreshUser } = useAuth();
  const toast = useToast();

  const [styles, setStyles] = useState([]);
  const [style, setStyle] = useState(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    remixApi
      .getStyles()
      .then((res) => {
        setStyles(res.data.data);
        setStyle(res.data.data[0]?.id || null);
      })
      .catch(() => setStyles([]));
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const pickFile = (selected) => {
    if (!selected) return;

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError('Faqat JPEG, PNG yoki WEBP formatidagi rasm qabul qilinadi.');
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError("Rasm hajmi 8MB dan oshmasligi kerak.");
      return;
    }

    setError('');
    setFile(selected);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    pickFile(e.dataTransfer.files?.[0]);
  };

  const handleSubmit = async () => {
    if (!file || !style) return;

    setSubmitting(true);
    setError('');
    setResult(null);

    try {
      const res = await remixApi.remix(file, style);
      setResult(res.data.data);
      refreshUser();
      toast.success('Remix tayyor!');
    } catch (err) {
      if (err.response?.status === 402) {
        toast.error('Kredit yetarli emas.');
      } else if (err.response?.status === 429) {
        toast.error(err.response.data.error);
      } else {
        setError(err.response?.data?.error || 'Remix qilishda xatolik yuz berdi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setResult(null);
    setError('');
  };

  const cost = 2;
  const notEnough = cost > credits;

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <Badge tone="brand">🔁 Remix</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
          Rasmni bir bosishda o'zgartiring
        </h1>
        <p className="mt-1.5 text-zinc-400">Rasm yuklang, uslubni tanlang — AI uni qayta chizadi.</p>

        {!result && (
          <div className="mt-8 space-y-6">
            {!previewUrl ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-white/4 text-center transition-colors hover:border-violet-500/50"
              >
                <span className="text-4xl">📤</span>
                <p className="mt-3 text-zinc-300">Rasmni bu yerga tashlang yoki bosing</p>
                <p className="mt-1 text-xs text-zinc-600">JPEG, PNG yoki WEBP · 8MB gacha</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
              </div>
            ) : (
              <div className="relative">
                <img src={previewUrl} alt="Tanlangan rasm" className="w-full rounded-2xl" />
                <button
                  onClick={reset}
                  className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white hover:bg-black/80"
                >
                  Almashtirish
                </button>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            {styles.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-zinc-300">Uslub tanlang</p>
                <div className="flex flex-wrap gap-2">
                  {styles.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStyle(s.id)}
                      disabled={submitting}
                      className={cx(
                        'rounded-full border px-4 py-2 text-sm transition-colors disabled:opacity-50',
                        style === s.id
                          ? 'border-violet-500 bg-violet-500/15 text-white'
                          : 'border-white/10 bg-white/4 text-zinc-400 hover:border-white/20'
                      )}
                    >
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">
                Narx: <span className={notEnough ? 'text-red-400' : 'text-zinc-300'}>◆ {cost}</span>
              </span>
              <Button onClick={handleSubmit} disabled={!file || !style || submitting || notEnough}>
                {submitting ? 'Yaratilmoqda...' : 'Remix qilish'}
              </Button>
            </div>

            {notEnough && (
              <p className="text-center text-sm text-red-300">
                Kreditingiz yetarli emas.{' '}
                <Link to="/billing" className="underline">
                  Kredit sotib olish
                </Link>
              </p>
            )}
          </div>
        )}

        {submitting && (
          <Card className="mt-8 flex flex-col items-center gap-3 p-12">
            <Spinner size="lg" />
            <p className="text-zinc-400">AI rasmni qayta chizmoqda...</p>
          </Card>
        )}

        {result?.status === 'COMPLETED' && (
          <div className="mt-8 space-y-4">
            {previewUrl && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-xs text-zinc-500">Oldin</p>
                  <img src={previewUrl} alt="Original" className="w-full rounded-xl" />
                </div>
                <div>
                  <p className="mb-1 text-xs text-zinc-500">Keyin</p>
                  <img src={result.resultUrl} alt="Remix natijasi" className="w-full rounded-xl" />
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() =>
                  generationApi
                    .download(result.id, `remix-${result.id}.png`)
                    .catch(() => toast.error('Yuklab olishda xatolik.'))
                }
              >
                Yuklab olish
              </Button>
              <Button onClick={reset} variant="secondary" className="flex-1">
                Yana remix qilish
              </Button>
            </div>
          </div>
        )}

        {result?.status === 'FAILED' && (
          <Card className="mt-8 p-6 text-center">
            <Badge tone="danger">Xato</Badge>
            <p className="mt-3 text-zinc-300">{result.errorMessage}</p>
            <Button onClick={reset} variant="secondary" className="mt-5">
              Qaytadan urinish
            </Button>
          </Card>
        )}
      </div>
    </Layout>
  );
}
