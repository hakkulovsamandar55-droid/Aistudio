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
import { remixApi } from '../api/remix.api';
import { Spinner, cx } from '../components/ui';

/**
 * The "Bosh" tab — and the whole point of the product: say what you want,
 * AI Studio figures out whether that's a video, an image, a voice line or
 * text and makes it. No media-type picker, no settings screen — the same
 * intent-analysis + orchestrator pipeline Magic Mode already runs, wearing
 * a chat interface instead of a plan-preview form.
 */

const POLL_MS = 3000;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Frontend-only keyword match so a caption like "buni anime qilib ber" auto-picks
// the right Remix style; falls back to the first available style otherwise.
const STYLE_KEYWORDS = {
  anime: ['anime', 'manga'],
  pixar: ['pixar', 'multfilm', 'multik', 'cartoon'],
  lego: ['lego'],
  comic: ['comic', 'komiks'],
  gta: ['gta'],
  realistic: ['realistik', 'real', 'foto'],
};

function detectRemixStyle(text, styles) {
  const lower = text.toLowerCase();
  for (const s of styles) {
    const keywords = STYLE_KEYWORDS[s.id] || [];
    if (keywords.some((k) => lower.includes(k))) return s.id;
  }
  return styles[0]?.id || null;
}

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
        <div className="max-w-[85%] space-y-1.5">
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt="Yuborilgan rasm"
              className="ml-auto max-h-64 rounded-2xl rounded-tr-sm bg-[#f4efe6] object-cover"
            />
          )}
          {message.text && (
            <div className="rounded-2xl rounded-tr-sm bg-[#5b45e0] px-4 py-2.5 text-white">
              {message.text}
            </div>
          )}
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
  const [remixStyles, setRemixStyles] = useState([]);
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedPreviewUrl, setAttachedPreviewUrl] = useState(null);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    remixApi
      .getStyles()
      .then((res) => setRemixStyles(res.data.data))
      .catch(() => setRemixStyles([]));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (attachedPreviewUrl) URL.revokeObjectURL(attachedPreviewUrl);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const pickFile = (selected) => {
    if (!selected) return;
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      toast.error('Faqat JPEG, PNG yoki WEBP formatidagi rasm qabul qilinadi.');
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      toast.error('Rasm hajmi 8MB dan oshmasligi kerak.');
      return;
    }
    if (attachedPreviewUrl) URL.revokeObjectURL(attachedPreviewUrl);
    setAttachedFile(selected);
    setAttachedPreviewUrl(URL.createObjectURL(selected));
  };

  const clearAttachment = () => {
    if (attachedPreviewUrl) URL.revokeObjectURL(attachedPreviewUrl);
    setAttachedFile(null);
    setAttachedPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

  const sendImage = async () => {
    const file = attachedFile;
    const previewUrl = attachedPreviewUrl;
    const caption = input.trim();

    setInput('');
    setAttachedFile(null);
    setAttachedPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const userId = crypto.randomUUID();
    const bubbleId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', kind: 'text', text: caption, imageUrl: previewUrl },
      { id: bubbleId, role: 'ai', kind: 'thinking' },
    ]);
    setSending(true);

    try {
      const style = detectRemixStyle(caption, remixStyles);
      const res = await remixApi.remix(file, style);
      const generation = res.data.data;
      refreshUser();
      if (generation.status === 'FAILED') {
        patchMessage(bubbleId, { kind: 'error', text: generation.errorMessage || 'Rasmni qayta ishlab bo\'lmadi.' });
      } else {
        patchMessage(bubbleId, {
          kind: 'result',
          project: { status: 'COMPLETED', generations: [generation] },
        });
      }
    } catch (err) {
      if (err.response?.status === 402) {
        patchMessage(bubbleId, { kind: 'error', text: 'Kredit yetarli emas.', showBilling: true });
      } else if (err.response?.status === 429) {
        patchMessage(bubbleId, { kind: 'error', text: err.response.data.error });
      } else {
        patchMessage(bubbleId, {
          kind: 'error',
          text: err.response?.data?.error || 'Rasmni qayta ishlashda xatolik yuz berdi.',
        });
      }
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    if (sending) return;
    if (attachedFile) return sendImage();

    const text = input.trim();
    if (!text) return;

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
        <div className="mx-auto max-w-3xl">
          {attachedPreviewUrl && (
            <div className="mb-2 flex items-center gap-2 rounded-2xl border border-[#e8e0d3] bg-[#faf7f1] p-2">
              <img src={attachedPreviewUrl} alt="Tanlangan rasm" className="h-12 w-12 rounded-xl object-cover" />
              <p className="flex-1 truncate text-xs text-[#6d655a]">{attachedFile?.name}</p>
              <button
                onClick={clearAttachment}
                aria-label="Rasmni olib tashlash"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#a1978a] hover:bg-[#f0ebe0] hover:text-[#37322b]"
              >
                <Icon name="close" size="xs" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              aria-label="Rasm biriktirish"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#e8e0d3] bg-white text-[#6d655a] transition-colors hover:border-[#5b45e0] hover:text-[#5b45e0] disabled:opacity-60"
            >
              <Icon name="upload" size="md" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={
                attachedFile
                  ? 'Ixtiyoriy izoh — masalan: anime qilib ber'
                  : "Xabar yozing — masalan: mushuk kosmosda pitsa pishiryapti"
              }
              disabled={sending}
              className="w-full rounded-full border border-[#e8e0d3] bg-[#faf7f1] px-4 py-3 text-[15px] text-[#1c1a17] placeholder:text-[#a1978a] focus:border-[#5b45e0] focus:outline-none disabled:opacity-60"
            />
            <button
              onClick={send}
              disabled={(!input.trim() && !attachedFile) || sending}
              aria-label="Yuborish"
              className={cx(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-colors',
                (!input.trim() && !attachedFile) || sending ? 'bg-[#d8cdba]' : 'bg-[#5b45e0] hover:bg-[#4733c4]'
              )}
            >
              <Icon name="arrowRight" size="md" />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
