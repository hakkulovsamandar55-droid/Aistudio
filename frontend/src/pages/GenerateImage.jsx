import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { generationApi } from '../api/generation.api';
import { useAuth } from '../context/AuthContext';

export default function GenerateImage() {
  const { refreshUser } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await generationApi.generateImage(prompt.trim());
      setResult(response.data.data);
      refreshUser();
    } catch (err) {
      if (err.response?.status === 402) {
        setShowInsufficientModal(true);
      } else {
        setError(err.response?.data?.error || 'Rasm yaratishda xatolik yuz berdi.');
      }
    } finally {
      setLoading(false);
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
        <h1 className="text-2xl font-bold text-gray-900">🖼️ Rasm yaratish</h1>
        <p className="mt-1 text-gray-500">G'oyangizni yozing, AI Studio uni professional rasmga aylantiradi.</p>

        {!result && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={500}
              rows={5}
              placeholder="G'oyangizni yozing... masalan: mushuk pitsa pishiryapti kosmosda"
              className="w-full rounded-xl border border-gray-300 p-4 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Bu 2 kredit sarflaydi</span>
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Yaratilmoqda...' : 'Yaratish'}
              </button>
            </div>
          </form>
        )}

        {loading && (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-xl bg-white p-10 shadow">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="text-gray-500">AI sizning g'oyangizni ishlab chiqmoqda...</p>
          </div>
        )}

        {result && result.status === 'COMPLETED' && (
          <div className="mt-8 space-y-4">
            <img src={result.resultUrl} alt={result.userPrompt} className="w-full rounded-xl shadow-lg" />
            <div className="flex gap-3">
              <a
                href={result.resultUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-center font-medium text-white hover:bg-indigo-700"
              >
                Yuklab olish
              </a>
              <button
                onClick={reset}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
              >
                Yana yaratish
              </button>
            </div>
          </div>
        )}

        {result && result.status === 'FAILED' && (
          <div className="mt-8 rounded-xl bg-red-50 p-6 text-center text-red-600">
            Xatolik yuz berdi: {result.errorMessage}
            <button onClick={reset} className="mt-4 block w-full rounded-lg bg-red-600 py-2.5 font-medium text-white">
              Qaytadan urinish
            </button>
          </div>
        )}
      </div>

      {showInsufficientModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Kreditingiz yetarli emas</h2>
            <p className="mt-2 text-gray-500">Rasm yaratish uchun ko'proq kredit kerak.</p>
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
