import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Icon } from '../components/icons';
import { remixApi } from '../api/remix.api';
import { generationApi } from '../api/generation.api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, Badge, Spinner, CreditPill, cx } from '../components/ui';

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
      setError('Rasm hajmi 8MB dan oshmasligi kerak.');
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
    <Layout title="Remix" back="/create">
      {!result && !submitting && (
        <div className="space-y-6">
          <p className="text-[#6d655a]">Rasm yuklang, uslubni tanlang — AI uni qayta chizadi.</p>

          {!previewUrl ? (
            <button
              type="button"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d8cdba] bg-white text-center transition-colors hover:border-[#5b45e0] hover:bg-[#faf7f1]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4efe6] text-[#5b45e0]">
                <Icon name="upload" size="lg" />
              </span>
              <p className="mt-3 font-medium text-[#37322b]">Rasmni tashlang yoki bosing</p>
              <p className="mt-1 text-xs text-[#a1978a]">JPEG, PNG yoki WEBP · 8MB gacha</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </button>
          ) : (
            <div className="relative overflow-hidden rounded-2xl">
              <img src={previewUrl} alt="Tanlangan rasm" className="w-full bg-[#f4efe6]" />
              <button
                onClick={reset}
                className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-[#37322b] shadow-sm transition-colors hover:bg-white"
              >
                <Icon name="refresh" size="xs" />
                Almashtirish
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-[#a8352a]">{error}</div>
          )}

          {styles.length > 0 && (
            <div>
              <p className="mb-2.5 text-sm font-medium text-[#37322b]">Uslub tanlang</p>
              <div className="grid grid-cols-3 gap-2.5">
                {styles.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyle(s.id)}
                    disabled={submitting}
                    className={cx(
                      'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-sm transition-colors disabled:opacity-50',
                      style === s.id
                        ? 'border-[#5b45e0] bg-[#efecff] font-medium text-[#4733c4]'
                        : 'border-[#e8e0d3] bg-white text-[#6d655a] hover:border-[#d8cdba]'
                    )}
                  >
                    <Icon name={s.icon || 'palette'} size="md" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-[#6d655a]">
              Narx
              <CreditPill amount={cost} tone={notEnough ? 'danger' : 'neutral'} />
            </span>
            <Button
              onClick={handleSubmit}
              disabled={!file || !style || submitting || notEnough}
              icon="remix"
            >
              Remix qilish
            </Button>
          </div>

          {notEnough && (
            <p className="text-center text-sm text-[#a8352a]">
              Kreditingiz yetarli emas.{' '}
              <Link to="/billing" className="font-medium underline">
                Kredit sotib olish
              </Link>
            </p>
          )}
        </div>
      )}

      {submitting && (
        <Card className="flex flex-col items-center gap-3 p-14">
          <Spinner size="lg" />
          <p className="text-[#6d655a]">AI rasmni qayta chizmoqda...</p>
        </Card>
      )}

      {result?.status === 'COMPLETED' && (
        <div className="space-y-4">
          {previewUrl && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-[#a1978a]">Oldin</p>
                <img src={previewUrl} alt="Original" className="w-full rounded-xl bg-[#f4efe6]" />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-[#5b45e0]">Keyin</p>
                <img
                  src={result.resultUrl}
                  alt="Remix natijasi"
                  className="w-full rounded-xl bg-[#f4efe6]"
                />
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <Button
              className="flex-1"
              icon="download"
              onClick={() =>
                generationApi
                  .download(result.id, `remix-${result.id}.png`)
                  .catch(() => toast.error('Yuklab olishda xatolik.'))
              }
            >
              Yuklab olish
            </Button>
            <Button onClick={reset} variant="secondary" className="flex-1" icon="refresh">
              Yana remix
            </Button>
          </div>
        </div>
      )}

      {result?.status === 'FAILED' && (
        <Card className="p-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fbeceb] text-[#a8352a]">
            <Icon name="alert" size="lg" />
          </span>
          <Badge tone="danger" className="mt-3">
            Xato
          </Badge>
          <p className="mt-3 text-[#37322b]">{result.errorMessage}</p>
          <Button onClick={reset} variant="secondary" className="mt-5" icon="refresh">
            Qaytadan urinish
          </Button>
        </Card>
      )}
    </Layout>
  );
}
