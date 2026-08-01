import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-6 text-center">
      <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">AI Studio</h1>
      <p className="mt-4 text-lg text-gray-600">Say your idea. AI does the rest.</p>
      <p className="mx-auto mt-6 max-w-xl text-gray-500">
        G'oyangizni oddiy so'zlar bilan yozing — AI Studio uni professional rasm yoki videoga aylantiradi.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          to={isAuthenticated ? '/dashboard' : '/register'}
          className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white shadow hover:bg-indigo-700"
        >
          {isAuthenticated ? "Dashboard'ga o'tish" : 'Boshlash'}
        </Link>
        {!isAuthenticated && (
          <Link
            to="/login"
            className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Kirish
          </Link>
        )}
      </div>
    </div>
  );
}
