import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Segmented, cx } from '../components/ui';

/**
 * Login and Sign-up used to be two separate pages that felt like two
 * different products. They're really one screen with two modes, so they
 * live in one component now: a tab switches the mode, the fields crossfade,
 * and a wrong password shakes the form instead of a page reload.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const MODES = [
  { value: 'login', label: 'Kirish' },
  { value: 'register', label: "Ro'yxatdan o'tish" },
];

export default function Auth({ initialMode = 'login' }) {
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = (searchParams.get('ref') || '').toUpperCase();

  const [mode, setMode] = useState(initialMode);
  const [renderMode, setRenderMode] = useState(initialMode);
  const [fading, setFading] = useState(false);
  const switchTimeout = useRef(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: refCode,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shaking, setShaking] = useState(false);
  const shakeTimeout = useRef(null);

  const switchMode = (next) => {
    if (next === mode || fading) return;
    setFading(true);
    setError('');
    setFieldErrors({});
    if (switchTimeout.current) clearTimeout(switchTimeout.current);
    switchTimeout.current = window.setTimeout(() => {
      setMode(next);
      setRenderMode(next);
      setFading(false);
    }, 130);
  };

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const triggerShake = () => {
    if (shakeTimeout.current) clearTimeout(shakeTimeout.current);
    setShaking(false);
    // Re-triggering the same animation needs a frame between remove/add.
    requestAnimationFrame(() => setShaking(true));
    shakeTimeout.current = window.setTimeout(() => setShaking(false), 450);
  };

  const validate = () => {
    const errs = {};
    if (!EMAIL_REGEX.test(form.email)) errs.email = "Email formati noto'g'ri";
    if (form.password.length < 8) errs.password = "Parol kamida 8 belgidan iborat bo'lishi kerak";
    if (mode === 'register') {
      if (!form.name.trim()) errs.name = 'Ism kiritilishi shart';
      if (form.password !== form.confirmPassword) errs.confirmPassword = 'Parollar mos kelmadi';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      triggerShake();
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.email, form.password, form.name, form.referralCode.trim() || undefined);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || "Xatolik yuz berdi. Qaytadan urinib ko'ring.");
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Google orqali kirishda xatolik yuz berdi.');
      triggerShake();
    }
  };

  return (
    <AuthLayout title="AI Studio'ga xush kelibsiz" subtitle="G'oyangizni ayting — qolganini AI bajaradi">
      <Segmented options={MODES} value={mode} onChange={switchMode} className="mb-6 w-full" />

      <form
        onSubmit={handleSubmit}
        noValidate
        className={cx('space-y-3.5', shaking && 'animate-shake')}
      >
        <div key={renderMode} className={cx(fading ? 'animate-fade-out' : 'animate-rise', 'space-y-3.5')}>
          {renderMode === 'register' && (
            <div>
              <Input
                label="Ism"
                type="text"
                value={form.name}
                onChange={update('name')}
                placeholder="Ismingiz"
                className={fieldErrors.name && 'border-[#d94a3d] focus:border-[#d94a3d] focus:ring-[#d94a3d]/15'}
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-[#a8352a]">{fieldErrors.name}</p>}
            </div>
          )}

          <div>
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="siz@email.com"
              className={fieldErrors.email && 'border-[#d94a3d] focus:border-[#d94a3d] focus:ring-[#d94a3d]/15'}
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-[#a8352a]">{fieldErrors.email}</p>}
          </div>

          <div>
            <Input
              label="Parol"
              type="password"
              value={form.password}
              onChange={update('password')}
              placeholder={renderMode === 'register' ? 'Kamida 8 belgi' : '••••••••'}
              className={fieldErrors.password && 'border-[#d94a3d] focus:border-[#d94a3d] focus:ring-[#d94a3d]/15'}
            />
            {fieldErrors.password && <p className="mt-1 text-xs text-[#a8352a]">{fieldErrors.password}</p>}
          </div>

          {renderMode === 'register' && (
            <>
              <div>
                <Input
                  label="Parolni tasdiqlang"
                  type="password"
                  value={form.confirmPassword}
                  onChange={update('confirmPassword')}
                  placeholder="••••••••"
                  className={
                    fieldErrors.confirmPassword && 'border-[#d94a3d] focus:border-[#d94a3d] focus:ring-[#d94a3d]/15'
                  }
                />
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-[#a8352a]">{fieldErrors.confirmPassword}</p>
                )}
              </div>
              <Input
                label="Taklif kodi (ixtiyoriy)"
                type="text"
                value={form.referralCode}
                onChange={(e) => setForm((prev) => ({ ...prev, referralCode: e.target.value.toUpperCase() }))}
                className="uppercase tracking-widest"
                placeholder="ABCD1234"
              />
            </>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-[#a8352a]">{error}</div>
        )}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Yuklanmoqda...' : mode === 'login' ? 'Kirish' : "Ro'yxatdan o'tish"}
        </Button>

        {mode === 'login' && (
          <p className="text-center text-sm">
            <Link to="/forgot-password" className="text-[#a1978a] hover:text-[#6d655a] hover:underline">
              Parolni unutdingizmi?
            </Link>
          </p>
        )}
      </form>

      {GOOGLE_CLIENT_ID && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-[#a1978a]">
            <span className="h-px flex-1 bg-[#e8e0d3]" />
            yoki
            <span className="h-px flex-1 bg-[#e8e0d3]" />
          </div>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                setError('Google orqali kirishda xatolik yuz berdi.');
                triggerShake();
              }}
              theme="outline"
              shape="pill"
              text={mode === 'login' ? 'signin_with' : 'signup_with'}
              locale="uz"
              width="280"
            />
          </div>
        </>
      )}
    </AuthLayout>
  );
}
