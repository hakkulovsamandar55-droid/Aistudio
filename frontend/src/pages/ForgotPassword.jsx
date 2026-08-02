import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth.api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await authApi.forgotPassword(email.trim().toLowerCase());
      setSent(true);
      // Only present while the backend runs outside production, so the flow
      // can be walked through before an email provider is wired up.
      setDevToken(res.data.data.devResetToken || null);
    } catch (err) {
      setError(err.response?.data?.error || 'Xatolik yuz berdi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-center text-2xl font-bold text-gray-900">Parolni tiklash</h1>

        {!sent ? (
          <>
            <p className="mt-1 text-center text-sm text-gray-500">
              Emailingizni kiriting — tiklash havolasini yuboramiz.
            </p>

            {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="siz@email.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Yuborilmoqda...' : 'Yuborish'}
              </button>
            </form>
          </>
        ) : (
          <div className="mt-6 space-y-4 text-center">
            <p className="text-sm text-gray-600">
              Agar bu email ro'yxatdan o'tgan bo'lsa, tiklash havolasi yuborildi.
            </p>

            {devToken && (
              <div className="rounded-lg bg-amber-50 p-3 text-left">
                <p className="text-xs font-medium text-amber-800">Dev rejimi — tiklash havolasi:</p>
                <Link
                  to={`/reset-password?token=${devToken}`}
                  className="mt-1 block break-all text-xs text-indigo-600 underline"
                >
                  /reset-password?token={devToken.slice(0, 24)}...
                </Link>
              </div>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">
            Kirish sahifasiga qaytish
          </Link>
        </p>
      </div>
    </div>
  );
}
