import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || "Kirishda xatolik yuz berdi. Qaytadan urinib ko'ring.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Xush kelibsiz"
      subtitle="AI Studio hisobingizga kiring"
      footer={
        <>
          Hisobingiz yo'qmi?{' '}
          <Link to="/register" className="font-medium text-[#5b45e0] hover:underline">
            Ro'yxatdan o'tish
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-[#a8352a]">{error}</div>
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
        <Input
          label="Parol"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Kirilmoqda...' : 'Kirish'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link to="/forgot-password" className="text-[#a1978a] hover:text-[#6d655a] hover:underline">
          Parolni unutdingizmi?
        </Link>
      </p>
    </AuthLayout>
  );
}
