import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import AnnouncementBanner from '../components/AnnouncementBanner';
import { Icon } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { userApi } from '../api/user.api';
import { magicApi, projectApi } from '../api/module.api';
import { generationApi } from '../api/generation.api';
import { Spinner, cx } from '../components/ui';

/**
 * The "Bosh" tab — and the whole point of the product: say what you want,
 * AI Studio figures out whether that's a video, an image, a voice line or
 * text and makes it. No media-type picker, no settings screen — the same
 * intent-analysis + orchestrator pipeline Magic Mode already runs, wearing
 * a chat interface instead of a plan-preview form.
 */

const POLL_MS = 3000;

function greeting(name) {
  return `Salom${name ? `, ${name}` : ''}! Menga g'oyangizni ayting — video, rasm, ovoz yoki matn kerakligini o'zim aniqlab, tayyorlab beraman.`;
}

const ROLE_LABELS = {
  strategy: 'Strategiya',
  script: 'Ssenariy',
  main: null,
  cover: null,
  voiceover: 'Diktor ovozi',
  soundtrack: 'Fon musiqasi',
  caption: 'Post matni',
  hashtags: 'Hashtaglar',
};

function AssetPreview({ asset }) {
  if (asset.status === 'FAILED') {
    return (
      <p className="rounded-xl bg-[#fbeceb] px-3 py-2 text-sm text-[#a8352a]">
        {asset.errorMessage || 'Xatolik yuz berdi'}
      </p>
    );
  }
  if (asset.status !== 'COMPLETED') {
    return (
      <div className="flex items-center gap-2 text-sm text-[#a1978a]">
        <Spinner size="sm" />
        Tayyorlanmoqda...
      </div>
    );
  }
  if (asset.resultText) {
    return (
      <pre className="whitespace-pre-wrap rounded-xl bg-[#faf7f1] p-3 font-sans text-sm leading-relaxed text-[#37322b]">
        {asset.resultText}
      </pre>
    );
  }
  if (asset.type === 'IMAGE') {
    return <img src={asset.resultUrl} alt={asset.userPrompt} className="w-full rounded-xl bg-[#f4efe6]" />;
  }
  if (asset.type === 'VIDEO') {
    // eslint-disable-next-line jsx-a11y/media-has-caption
    return <video src={asset.resultUrl} controls className="w-full rounded-xl bg-[#f4efe6]" />;
  }
  // eslint-disable-next-line jsx-a11y/media-has-caption
  return <audio src={asset.resultUrl} controls className="w-full" />;
}

function ChatBubble({ message, onDownload }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#5b45e0] px-4 py-2.5 text-white">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#5b45e0] text-white">
        <Icon name="sparkle" size="sm" />
      </span>
      <div className="min-w-0 max-w-[85%] flex-1 space-y-2.5">
        {message.kind === 'text' && (
          <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 text-[#37322b]">{message.text}</div>
        )}

        {message.kind === 'thinking' && (
          <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-[#6d655a]">
            <Spinner size="sm" />
            O'ylamoqda...
          </div>
        )}

        {message.kind === 'progress' && (
          <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-[#6d655a]">
            <Spinner size="sm" />
            {message.tasks?.[0]?.label ? `${message.tasks[0].label}...` : 'Tayyorlanmoqda...'}
          </div>
        )}

        {message.kind === 'error' && (
          <div className="rounded-2xl rounded-tl-sm bg-[#fbeceb] px-4 py-2.5 text-sm text-[#a8352a]">
            {message.text}
            {message.showBilling && (
              <Link to="/billing" className="ml-1 font-medium underline">
                Kredit sotib olish
              </Link>
            )}
          </div>
        )}

        {message.kind === 'result' && (
          <div className="rounded-2xl rounded-tl-sm bg-white p-3">
            <div className="space-y-3">
              {message.project.generations.map((asset) => (
                <div key={asset.id}>
                  {ROLE_LABELS[asset.role] && (
                    <p className="mb-1 text-xs font-medium text-[#a1978a]">{ROLE_LABELS[asset.role]}</p>
                  )}
                  <AssetPreview asset={asset} />
                  {asset.status === 'COMPLETED' && !asset.resultText && (
                    <button
                      onClick={() => onDownload(asset)}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[#5b45e0] hover:underline"
                    >
                      <Icon name="download" size="xs" />
                      Yuklab olish
                    </button>
                  )}
                </div>
              ))}
            </div>
            {message.project.status === 'PARTIAL' && (
              <p className="mt-2 text-xs text-[#a1978a]">Ba'zi qismlar yaratilmadi.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [messages, setMessages] = useState(() => [
    { id: 'greeting', role: 'ai', kind: 'text', text: greeting(user?.name) },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    []
  );

  const patchMessage = (id, patch) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));

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

  const download = (asset) => {
    const ext = asset.type === 'VIDEO' ? 'mp4' : asset.type === 'IMAGE' ? 'png' : 'mp3';
    generationApi.download(asset.id, `ai-studio-${asset.id}.${ext}`).catch(() => toast.error('Yuklab olishda xatolik.'));
  };

  const pollProject = (projectId, bubbleId) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await projectApi.get(projectId);
        const project = res.data.data;
        if (['COMPLETED', 'PARTIAL', 'FAILED'].includes(project.status)) {
          clearInterval(pollRef.current);
          refreshUser();
          if (project.status === 'FAILED') {
            patchMessage(bubbleId, {
              kind: 'error',
              text: project.generations[0]?.errorMessage || 'Yaratib bo\'lmadi.',
            });
          } else {
            patchMessage(bubbleId, { kind: 'result', project });
          }
        }
      } catch {
        clearInterval(pollRef.current);
        patchMessage(bubbleId, { kind: 'error', text: 'Holatni tekshirishda xatolik yuz berdi.' });
      }
    }, POLL_MS);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    const userId = crypto.randomUUID();
    const bubbleId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', kind: 'text', text },
      { id: bubbleId, role: 'ai', kind: 'thinking' },
    ]);
    setSending(true);

    try {
      const res = await magicApi.run(text);
      const { projectId, tasks } = res.data.data;
      refreshUser();
      patchMessage(bubbleId, { kind: 'progress', tasks });
      pollProject(projectId, bubbleId);
    } catch (err) {
      if (err.response?.status === 402) {
        patchMessage(bubbleId, { kind: 'error', text: 'Kredit yetarli emas.', showBilling: true });
      } else if (err.response?.status === 429) {
        patchMessage(bubbleId, { kind: 'error', text: err.response.data.error });
      } else {
        patchMessage(bubbleId, {
          kind: 'error',
          text: err.response?.data?.error || 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.',
        });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <AnnouncementBanner />

      {user?.dailyBonus?.available && (
        <button
          onClick={claimBonus}
          disabled={claiming}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#fdf3e3] px-3 py-1.5 text-xs font-medium text-[#95601a] ring-1 ring-[#f2e0bd] transition-colors hover:bg-[#fbedd6] disabled:opacity-60"
        >
          <Icon name="gift" size="xs" />
          {claiming ? '...' : `+${user.dailyBonus.amount} bonus olish`}
        </button>
      )}

      <div className="space-y-4">
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} onDownload={download} />
        ))}
        <div ref={bottomRef} className="h-20" />
      </div>

      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-[#e8e0d3] bg-white/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Xabar yozing — masalan: mushuk kosmosda pitsa pishiryapti"
            disabled={sending}
            className="w-full rounded-full border border-[#e8e0d3] bg-[#faf7f1] px-4 py-3 text-[15px] text-[#1c1a17] placeholder:text-[#a1978a] focus:border-[#5b45e0] focus:outline-none disabled:opacity-60"
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            aria-label="Yuborish"
            className={cx(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-colors',
              !input.trim() || sending ? 'bg-[#d8cdba]' : 'bg-[#5b45e0] hover:bg-[#4733c4]'
            )}
          >
            <Icon name="arrowRight" size="md" />
          </button>
        </div>
      </div>
    </Layout>
  );
}
