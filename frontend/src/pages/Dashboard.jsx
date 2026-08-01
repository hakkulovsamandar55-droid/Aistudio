import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../api/user.api';

const STATUS_LABELS = {
  PENDING: 'Navbatda',
  PROCESSING: 'Jarayonda',
  COMPLETED: 'Tayyor',
  FAILED: 'Xato',
};

export default function Dashboard() {
  const { user, credits } = useAuth();
  const [recentGenerations, setRecentGenerations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi
      .getGenerations(1, 5)
      .then((res) => setRecentGenerations(res.data.data))
      .catch(() => setRecentGenerations([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Salom, {user?.name}! 👋</h1>
        <p className="mt-1 text-gray-500">
          Joriy balansingiz: <span className="font-semibold text-indigo-600">💎 {credits} kredit</span>
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          to="/generate/image"
          className="group flex flex-col items-start rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-white shadow-lg transition hover:scale-[1.02]"
        >
          <span className="text-4xl">🖼️</span>
          <h2 className="mt-4 text-xl font-bold">Rasm yaratish</h2>
          <p className="mt-1 text-indigo-100">G'oyangizni yozing, AI rasmga aylantiradi</p>
        </Link>

        <Link
          to="/generate/video"
          className="group flex flex-col items-start rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 p-8 text-white shadow-lg transition hover:scale-[1.02]"
        >
          <span className="text-4xl">🎬</span>
          <h2 className="mt-4 text-xl font-bold">Video yaratish</h2>
          <p className="mt-1 text-pink-100">G'oyangizni yozing, AI videoga aylantiradi</p>
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">So'nggi generatsiyalar</h2>

        {loading && <p className="text-gray-500">Yuklanmoqda...</p>}

        {!loading && recentGenerations.length === 0 && (
          <p className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
            Hali hech narsa yaratmadingiz. Yuqoridan boshlang!
          </p>
        )}

        {!loading && recentGenerations.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-5">
            {recentGenerations.map((gen) => (
              <div key={gen.id} className="overflow-hidden rounded-xl bg-white shadow">
                <div className="flex aspect-square items-center justify-center bg-gray-100">
                  {gen.resultUrl ? (
                    gen.type === 'IMAGE' ? (
                      <img src={gen.resultUrl} alt={gen.userPrompt} className="h-full w-full object-cover" />
                    ) : (
                      <video src={gen.resultUrl} className="h-full w-full object-cover" muted />
                    )
                  ) : (
                    <span className="text-3xl">{gen.type === 'IMAGE' ? '🖼️' : '🎬'}</span>
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs text-gray-600">{gen.userPrompt}</p>
                  <p className="text-[11px] text-gray-400">{STATUS_LABELS[gen.status]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
