import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StylePicker from '../components/StylePicker';
import { generationApi } from '../api/generation.api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const POLL_INTERVAL_MS = 5000;

export default function GenerateVideo() {
  const { refreshUser } = useAuth();
  const toast = useToast();

  const [prompt, setPrompt] = useState('');
  const [styles, setStyles] = useState([]);
  const [style, setStyle] = useState('auto');
  const [cost, setCost] = useState(20);
  const [submitting, setSubmitting] = useState(false);
  const [generation, setGeneration] = useState(null);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    generationApi
      .getStyles()
      .then((res) => {
        setStyles(res.data.data.video);
        setCost(res.data.data.costs.VIDEO);
      })
      .catch(() => setStyles([]));
  }, []);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    pollRef.current = null;
    timerRef.current = null;
  };

  // Any in-flight interval must be torn down when the component unmounts,
  // otherwise it keeps polling (and calling setState) after navigation.
  useEffect(() => stopPolling, []);

  const startPolling = (generationId) => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);

    pollRef.current = setInterval(async () => {
      try {
        const response = await generationApi.getStatus(generationId);
        const updated = response.data.data;
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
      } catch (err) {
        stopPolling();
        setError('Holatni tekshirishda xatolik yuz berdi.');
      }
    }, POLL_INTERVAL_MS);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setSubmitting(true);
    setError('');
    setGeneration(null);

    try {
      const response = await generationApi.generateVideo(prompt.trim(), { style });
      const { generationId, status } = response.data.data;
      setGeneration({ id: generationId, status, userPrompt: prompt.trim() });
      startPolling(generationId);
    } catch (err) {
      if (err.response?.status === 402) {
        setShowInsufficientModal(true);
      } else {
        setError(err.response?.data?.error || 'Video yaratishda xatolik yuz berdi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    try {
      await generationApi.download(generation.id, `ai-studio-${generation.id}.mp4`);
    } catch {
      toast.error('Yuklab olishda xatolik yuz berdi.');
    }
  };

  const handleShare = async () => {
    try {
      const response = await generationApi.setPublic(generation.id, !generation.isPublic);
      setGeneration(response.data.data);
      toast.success(response.data.data.isPublic ? 'Galereyaga joylandi' : 'Galereyadan olib tashlandi');
    } catch {
      toast.error('Xatolik yuz berdi.');
    }
  };

  const reset = () => {
    stopPolling();
    setGeneration(null);
    setPrompt('');
    setError('');
  };

  const isProcessing = generation && (generation.status === 'PENDING' || generation.status === 'PROCESSING');

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">🎬 Video yaratish</h1>
        <p className="mt-1 text-gray-500">G'oyangizni yozing, AI Studio uni videoga aylantiradi.</p>

        {!generation && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={500}
                rows={4}
                disabled={submitting}
                placeholder="G'oyangizni yozing... masalan: mushuk pitsa pishiryapti kosmosda"
                className="w-full rounded-xl border border-gray-300 p-4 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
              />
              <p className="mt-1 text-right text-xs text-gray-400">{prompt.length}/500</p>
            </div>

            <StylePicker styles={styles} value={style} onChange={setStyle} disabled={submitting} />

            {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Bu {cost} kredit sarflaydi</span>
              <button
                type="submit"
                disabled={submitting || !prompt.trim()}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Yuborilmoqda...' : 'Yaratish'}
              </button>
            </div>
          </form>
        )}

        {isProcessing && (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-xl bg-white p-10 shadow">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="text-center text-gray-500">
              Video yaratilmoqda, bu bir necha daqiqa vaqt olishi mumkin...
            </p>
            <p className="text-sm text-gray-400">
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')} o'tdi
            </p>
          </div>
        )}

        {generation?.status === 'COMPLETED' && (
          <div className="mt-8 space-y-4">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={generation.resultUrl} controls className="w-full rounded-xl shadow-lg" />

            <button
              onClick={handleShare}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {generation.isPublic ? '🌍 Galereyada' : '🔒 Galereyaga joylash'}
            </button>

            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-center font-medium text-white hover:bg-indigo-700"
              >
                Yuklab olish
              </button>
              <button
                onClick={reset}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
              >
                Yana yaratish
              </button>
            </div>
          </div>
        )}

        {generation?.status === 'FAILED' && (
          <div className="mt-8 rounded-xl bg-red-50 p-6 text-center text-red-600">
            <p>Xatolik yuz berdi: {generation.errorMessage || "Noma'lum xato"}</p>
            <p className="mt-1 text-sm text-red-500">Kredit yechilmadi.</p>
            <button onClick={reset} className="mt-4 w-full rounded-lg bg-red-600 py-2.5 font-medium text-white">
              Qaytadan urinish
            </button>
          </div>
        )}
      </div>

      {showInsufficientModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Kreditingiz yetarli emas</h2>
            <p className="mt-2 text-gray-500">Video yaratish uchun ko'proq kredit kerak.</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowInsufficientModal(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 font-medium text-gray-700"
              >
                Yopish
              </button>
              <Link
                to="/billing"
                className="flex-1 rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700"
              >
                Kredit sotib olish
              </Link>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
