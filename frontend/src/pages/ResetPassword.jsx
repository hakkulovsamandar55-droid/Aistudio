import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { Icon } from '../components/icons';
import { authApi } from '../api/auth.api';
import { useToast } from '../context/ToastContext';
import { Button, Input } from '../components/ui';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError("Parol kamida 8 belgidan iborat bo'lishi kerak");
      return;
    }
    if (password !== confirm) {
      setError('Parollar mos kelmadi');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success('Parol yangilandi — endi kirishingiz mumkin');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Xatolik yuz berdi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Havola yaroqsiz">
        <div className="text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fbeceb] text-[#a8352a]">
            <Icon name="alert" size="lg" />
          </span>
          <p className="mt-3.5 text-sm text-[#6d655a]">Tiklash havolasi to'liq emas.</p>
          <Button to="/forgot-password" className="mt-5 w-full">
            Qaytadan so'rash
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Yangi parol" subtitle="Hisobingiz uchun yangi parol tanlang.">
      {error && (
        <div className="mb-4 rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-[#a8352a]">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Yangi parol (kamida 8 belgi)"
        />
        <Input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Parolni tasdiqlang"
        />
        <Button type="submit" disabled={submitting} className="w-full" icon="lock">
          {submitting ? 'Saqlanmoqda...' : "Parolni o'zgartirish"}
        </Button>
      </form>
    </AuthLayout>
  );
}
