import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { userApi } from '../api/user.api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, Input } from '../components/ui';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);

  const saveName = async (e) => {
    e.preventDefault();
    setSavingName(true);
    try {
      await userApi.updateMe(name.trim());
      await refreshUser();
      toast.success('Profil yangilandi');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Xatolik yuz berdi.');
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwords.next.length < 8) {
      setPasswordError("Yangi parol kamida 8 belgidan iborat bo'lishi kerak");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError('Parollar mos kelmadi');
      return;
    }

    setSavingPassword(true);
    try {
      await userApi.changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      toast.success("Parol o'zgartirildi");
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Xatolik yuz berdi.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Layout title="Sozlamalar" back="/profile">
      <div className="space-y-5">
        <Card className="p-5">
          <h2 className="font-medium text-[#1c1a17]">Profil</h2>
          <form onSubmit={saveName} className="mt-4 space-y-3.5">
            <Input label="Email" value={user?.email || ''} disabled />
            <Input
              label="Ism"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Button
              type="submit"
              disabled={savingName || !name.trim() || name.trim() === user?.name}
              icon="check"
            >
              {savingName ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="font-medium text-[#1c1a17]">Parolni o'zgartirish</h2>
          <form onSubmit={savePassword} className="mt-4 space-y-3.5">
            {passwordError && (
              <div className="rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-[#a8352a]">
                {passwordError}
              </div>
            )}
            <Input
              type="password"
              required
              value={passwords.current}
              onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
              placeholder="Joriy parol"
            />
            <Input
              type="password"
              required
              value={passwords.next}
              onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
              placeholder="Yangi parol (kamida 8 belgi)"
            />
            <Input
              type="password"
              required
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
              placeholder="Yangi parolni tasdiqlang"
            />
            <Button type="submit" disabled={savingPassword} icon="lock">
              {savingPassword ? "O'zgartirilmoqda..." : "Parolni o'zgartirish"}
            </Button>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
