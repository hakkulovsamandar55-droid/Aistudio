import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import StylePicker from '../components/StylePicker';
import { Icon } from '../components/icons';
import { generationApi } from '../api/generation.api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, Badge, Spinner, CreditPill } from '../components/ui';

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
      } else if (err.response?.status === 429) {
        toast.error(err.response.data.error);
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
    <Layout title="Rasm yaratish" back="/create">
      {!result && !loading && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="overflow-hidden p-0">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={500}
              rows={4}
              disabled={loading}
              placeholder="masalan: mushuk kosmosda pitsa pishiryapti"
              className="w-full resize-none bg-transparent p-4 text-[#1c1a17] placeholder:text-[#a1978a] focus:outline-none disabled:opacity-50"
            />
            <div className="border-t border-[#f0eae0] bg-[#faf7f1] px-4 py-2.5 text-right text-xs text-[#a1978a]">
              {prompt.length}/500
            </div>
          </Card>

          <StylePicker styles={styles} value={style} onChange={setStyle} disabled={loading} />

          {error && (
            <div className="rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-[#a8352a]">{error}</div>
          )}

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-[#6d655a]">
              Narx
              <CreditPill amount={cost} tone={notEnough ? 'danger' : 'neutral'} />
            </span>
            <Button type="submit" disabled={loading || !prompt.trim() || notEnough} icon="image">
              Yaratish
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
        </form>
      )}

      {loading && (
        <Card className="flex flex-col items-center gap-3 p-14">
          <Spinner size="lg" />
          <p className="text-[#6d655a]">AI sizning g'oyangizni ishlab chiqmoqda...</p>
        </Card>
      )}

      {result?.status === 'COMPLETED' && (
        <div className="space-y-4">
          <img
            src={result.resultUrl}
            alt={result.userPrompt}
            className="w-full rounded-2xl bg-[#f4efe6]"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={result.isFavorite ? 'starFilled' : 'star'}
              onClick={() => act(() => generationApi.setFavorite(result.id, !result.isFavorite))}
            >
              {result.isFavorite ? 'Sevimlida' : 'Sevimlilarga'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={result.isPublic ? 'globe' : 'lock'}
              onClick={() =>
                act(
                  () => generationApi.setPublic(result.id, !result.isPublic),
                  result.isPublic ? 'Galereyadan olindi' : 'Galereyaga joylandi'
                )
              }
            >
              {result.isPublic ? 'Galereyada' : 'Galereyaga joylash'}
            </Button>
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              icon="download"
              onClick={() =>
                generationApi
                  .download(result.id, `ai-studio-${result.id}.png`)
                  .catch(() => toast.error('Yuklab olishda xatolik.'))
              }
            >
              Yuklab olish
            </Button>
            <Button onClick={reset} variant="secondary" className="flex-1" icon="refresh">
              Yana yaratish
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
