import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import StylePicker from '../components/StylePicker';
import { generationApi } from '../api/generation.api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, Badge, Spinner } from '../components/ui';

export default function GenerateImage() {
  const { credits, refreshUser } = useAuth();
  const toast = useToast();

  const [prompt, setPrompt] = useState('');
  const [styles, setStyles] = useState([]);
  const [style, setStyle] = useState('auto');
  const [cost, setCost] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    generationApi
      .getStyles()
      .then((res) => {
        setStyles(res.data.data.image);
        setCost(res.data.data.costs.IMAGE);
      })
      .catch(() => setStyles([]));
  }, []);

  const notEnough = cost > credits;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await generationApi.generateImage(prompt.trim(), { style });
      setResult(res.data.data);
      refreshUser();
      toast.success('Rasm tayyor!');
    } catch (err) {
      if (err.response?.status === 402) {
        toast.error('Kredit yetarli emas.');
      } else {
        setError(err.response?.data?.error || 'Rasm yaratishda xatolik yuz berdi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const act = async (fn, okMessage) => {
    try {
      const res = await fn();
      setResult(res.data.data);
      if (okMessage) toast.success(okMessage);
    } catch {
      toast.error('Xatolik yuz berdi.');
    }
  };

  const reset = () => {
    setResult(null);
    setPrompt('');
    setError('');
  };

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-white">🖼️ Rasm yaratish</h1>
        <p className="mt-1.5 text-zinc-400">G'oyangizni yozing, uslubni tanlang.</p>

        {!result && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <Card className="p-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={500}
                rows={4}
                disabled={loading}
                placeholder="masalan: mushuk kosmosda pitsa pishiryapti"
                className="w-full resize-none bg-transparent p-4 text-white placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
              />
              <div className="px-4 pb-2 text-right text-xs text-zinc-600">{prompt.length}/500</div>
            </Card>

            <StylePicker styles={styles} value={style} onChange={setStyle} disabled={loading} />

            {error && (
              <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">
                Narx: <span className={notEnough ? 'text-red-400' : 'text-zinc-300'}>◆ {cost}</span>
              </span>
              <Button type="submit" disabled={loading || !prompt.trim() || notEnough}>
                {loading ? 'Yaratilmoqda...' : 'Yaratish'}
              </Button>
            </div>
          </form>
        )}

        {loading && (
          <Card className="mt-8 flex flex-col items-center gap-3 p-12">
            <Spinner size="lg" />
            <p className="text-zinc-400">AI sizning g'oyangizni ishlab chiqmoqda...</p>
          </Card>
        )}

        {result?.status === 'COMPLETED' && (
          <div className="mt-8 space-y-4">
            <img src={result.resultUrl} alt={result.userPrompt} className="w-full rounded-2xl" />

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  act(() => generationApi.setFavorite(result.id, !result.isFavorite))
                }
              >
                {result.isFavorite ? '★ Sevimlida' : '☆ Sevimlilarga'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  act(
                    () => generationApi.setPublic(result.id, !result.isPublic),
                    result.isPublic ? 'Galereyadan olindi' : 'Galereyaga joylandi'
                  )
                }
              >
                {result.isPublic ? '🌍 Galereyada' : '🔒 Galereyaga joylash'}
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() =>
                  generationApi
                    .download(result.id, `ai-studio-${result.id}.png`)
                    .catch(() => toast.error('Yuklab olishda xatolik.'))
                }
              >
                Yuklab olish
              </Button>
              <Button onClick={reset} variant="secondary" className="flex-1">
                Yana yaratish
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
