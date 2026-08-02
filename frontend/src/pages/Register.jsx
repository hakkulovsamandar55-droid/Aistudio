import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/ui';

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
    if (!form.name.trim()) return 'Ism kiritilishi shart';
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
    <AuthLayout
      title="Ro'yxatdan o'tish"
      subtitle="10 ta bepul kredit siz uchun tayyor"
      footer={
        <>
          Hisobingiz bormi?{' '}
          <Link to="/login" className="font-medium text-[#5b45e0] hover:underline">
            Kirish
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-[#a8352a]">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Ism"
          type="text"
          required
          value={form.name}
          onChange={update('name')}
          placeholder="Ismingiz"
        />
        <Input
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={update('email')}
          placeholder="siz@email.com"
        />
        <Input
          label="Parol"
          type="password"
          required
          value={form.password}
          onChange={update('password')}
          placeholder="Kamida 8 belgi"
        />
        <Input
          label="Parolni tasdiqlang"
          type="password"
          required
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          placeholder="••••••••"
        />
        <Input
          label="Taklif kodi (ixtiyoriy)"
          type="text"
          value={form.referralCode}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, referralCode: e.target.value.toUpperCase() }))
          }
          className="uppercase tracking-widest"
          placeholder="ABCD1234"
        />
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Yaratilmoqda...' : "Ro'yxatdan o'tish"}
        </Button>
      </form>
    </AuthLayout>
  );
}
