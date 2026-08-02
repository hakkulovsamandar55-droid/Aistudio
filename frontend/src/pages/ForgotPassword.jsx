import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { Icon } from '../components/icons';
import { authApi } from '../api/auth.api';
import { Button, Input } from '../components/ui';

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
    <AuthLayout
      title="Parolni tiklash"
      subtitle={sent ? undefined : 'Emailingizni kiriting — tiklash havolasini yuboramiz.'}
      footer={
        <Link to="/login" className="font-medium text-[#5b45e0] hover:underline">
          Kirish sahifasiga qaytish
        </Link>
      }
    >
      {!sent ? (
        <>
          {error && (
            <div className="mb-4 rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-[#a8352a]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="siz@email.com"
            />
            <Button type="submit" disabled={submitting} className="w-full" icon="mail">
              {submitting ? 'Yuborilmoqda...' : 'Yuborish'}
            </Button>
          </form>
        </>
      ) : (
        <div className="text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7f5ec] text-[#1f7a45]">
            <Icon name="check" size="lg" />
          </span>
          <p className="mt-3.5 text-sm text-[#6d655a]">
            Agar bu email ro'yxatdan o'tgan bo'lsa, tiklash havolasi yuborildi.
          </p>

          {devToken && (
            <div className="mt-4 rounded-xl border border-[#f2e0bd] bg-[#fdf3e3] p-3 text-left">
              <p className="text-xs font-medium text-[#95601a]">Dev rejimi — tiklash havolasi:</p>
              <Link
                to={`/reset-password?token=${devToken}`}
                className="mt-1 block break-all text-xs text-[#5b45e0] underline"
              >
                /reset-password?token={devToken.slice(0, 24)}...
              </Link>
            </div>
          )}
        </div>
      )}
    </AuthLayout>
  );
}
