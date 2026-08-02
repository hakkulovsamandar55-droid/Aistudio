import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import AnnouncementBanner from '../components/AnnouncementBanner';
import { Icon } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { userApi } from '../api/user.api';
import { Card } from '../components/ui';

/**
 * The screen a user lands on after signing in. This is a work surface, not a
 * landing page: one glance should show the balance, one action should start
 * a video, and everything else (loyihalar, tarix) lives one tap away in the
 * Ishlarim tab rather than scrolled past here.
 */

const QUICK_TOOLS = [
  { to: '/generate/image', icon: 'image', label: 'Rasm' },
  { to: '/remix', icon: 'remix', label: 'Remix' },
  { to: '/library', icon: 'library', label: 'Kutubxona' },
];

export default function Dashboard() {
  const { user, credits, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [idea, setIdea] = useState('');
  const [claiming, setClaiming] = useState(false);

  const claimBonus = async () => {
    setClaiming(true);
    try {
      const res = await userApi.claimDailyBonus();
      await refreshUser();
      toast.success(`+${res.data.data.awarded} kredit qo'shildi!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bonus olishda xatolik.');
    } finally {
      setClaiming(false);
    }
  };

  const startIdea = () => {
    const trimmed = idea.trim();
    navigate('/generate/video', trimmed ? { state: { prompt: trimmed } } : undefined);
  };

  return (
    <Layout>
      <AnnouncementBanner />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#1c1a17]">Salom, {user?.name}</h1>
          <p className="mt-0.5 text-sm text-[#6d655a]">
            Balans <span className="font-medium text-[#4733c4]">{credits} kredit</span>
          </p>
        </div>

        {user?.dailyBonus?.available && (
          <button
            onClick={claimBonus}
            disabled={claiming}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#fdf3e3] px-3 py-1.5 text-xs font-medium text-[#95601a] ring-1 ring-[#f2e0bd] transition-colors hover:bg-[#fbedd6] disabled:opacity-60"
          >
            <Icon name="gift" size="xs" />
            {claiming ? '...' : `+${user.dailyBonus.amount} bonus`}
          </button>
        )}
      </div>

      <Card className="aura mt-6 overflow-hidden p-2">
        <div className="flex items-center gap-1 rounded-xl px-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center text-[#5b45e0]">
            <Icon name="magic" size="md" />
          </span>
          <input
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startIdea()}
            placeholder="G'oyangizni yozing — video tayyorlaymiz"
            className="w-full bg-transparent py-4 text-[15px] text-[#1c1a17] placeholder:text-[#a1978a] focus:outline-none"
          />
          <button
            onClick={startIdea}
            aria-label="Davom etish"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5b45e0] text-white transition-colors hover:bg-[#4733c4] active:bg-[#3f2cb0]"
          >
            <Icon name="arrowRight" size="md" />
          </button>
        </div>
      </Card>
      <p className="mt-2 px-1 text-xs text-[#a1978a]">
        Yoki{' '}
        <Link to="/magic" className="text-[#5b45e0] hover:underline">
          Magic Mode
        </Link>{' '}
        orqali to'liq kampaniya yarating.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {QUICK_TOOLS.map((tool) => (
          <Link key={tool.to} to={tool.to}>
            <Card hover className="flex h-full flex-col items-center gap-2 p-4 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4efe6] text-[#5b45e0]">
                <Icon name={tool.icon} size="md" />
              </span>
              <span className="text-sm font-medium text-[#1c1a17]">{tool.label}</span>
            </Card>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
