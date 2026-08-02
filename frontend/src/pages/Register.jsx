import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Prefilled when arriving from a shared referral link (/register?ref=CODE).
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: (searchParams.get('ref') || '').toUpperCase(),
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    if (!form.name.trim()) return "Ism kiritilishi shart";
    if (!EMAIL_REGEX.test(form.email)) return "Email formati noto'g'ri";
    if (form.password.length < 8) return "Parol kamida 8 belgidan iborat bo'lishi kerak";
    if (form.password !== form.confirmPassword) return 'Parollar mos kelmadi';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await register(form.email, form.password, form.name, form.referralCode.trim() || undefined);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || "Ro'yxatdan o'tishda xatolik yuz berdi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Ro'yxatdan o'tish</h1>
          <p className="mt-1 text-sm text-gray-500">10 ta bepul kredit siz uchun tayyor</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Ism</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={update('name')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Ismingiz"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={update('email')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="siz@email.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Parol</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={update('password')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Kamida 8 belgi"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Parolni tasdiqlang</label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Taklif kodi <span className="font-normal text-gray-400">(ixtiyoriy)</span>
            </label>
            <input
              type="text"
              value={form.referralCode}
              onChange={(e) => setForm((prev) => ({ ...prev, referralCode: e.target.value.toUpperCase() }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase tracking-widest focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="ABCD1234"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Yaratilmoqda..." : "Ro'yxatdan o'tish"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Hisobingiz bormi?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">
            Kirish
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-gray-500">
          <Link to="/gallery" className="hover:underline">
            Galereyani ko'rish
          </Link>
        </p>
      </div>
    </div>
  );
}
