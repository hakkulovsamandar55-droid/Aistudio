import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { moduleApi } from '../api/module.api';
import { Button, Card, Badge } from '../components/ui';

const EXAMPLES = [
  'mushuk kosmosda pitsa pishiryapti',
  'Marvel uslubida video yasa',
  'TikTok uchun reklama roligi',
  'brendim uchun Instagram kampaniyasi',
];

const STEPS = [
  { n: '01', title: 'G\'oyangizni yozing', text: 'Oddiy jumla bilan. Texnik bilim shart emas.' },
  { n: '02', title: 'AI tushunadi', text: 'Nima kerakligini o\'zi aniqlaydi va rejalashtiradi.' },
  { n: '03', title: 'Tayyor natija', text: 'Rasm, video, ovoz, matn — hammasi bir bosishda.' },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [modules, setModules] = useState([]);
  const [exampleIndex, setExampleIndex] = useState(0);

  useEffect(() => {
    moduleApi.list().then((res) => setModules(res.data.data)).catch(() => setModules([]));
  }, []);

  // Cycles the placeholder so the hero demonstrates the range of requests
  // the platform accepts without needing a video.
  useEffect(() => {
    const id = setInterval(() => setExampleIndex((prev) => (prev + 1) % EXAMPLES.length), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-[#08080c]">
      <header className="sticky top-0 z-20 border-b border-white/6 bg-[#08080c]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight text-white">
            AI Studio
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/gallery"
              className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              Galereya
            </Link>
            {isAuthenticated ? (
              <Button to="/dashboard" size="sm">
                Dashboard
              </Button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Kirish
                </Link>
                <Button to="/register" size="sm">
                  Bepul boshlash
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="grid-bg relative overflow-hidden">
        <div className="aura mx-auto max-w-4xl px-5 pb-24 pt-20 text-center sm:pt-28">
          <Badge tone="brand" className="animate-rise">
            ✨ Magic Mode — bitta jumla, to'liq natija
          </Badge>

          <h1 className="animate-rise mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-6xl">
            G'oyangizni ayting.
            <br />
            <span className="gradient-text">Qolganini AI bajaradi.</span>
          </h1>

          <p className="animate-rise mx-auto mt-6 max-w-xl text-lg text-zinc-400">
            Prompt yozishni o'rganish shart emas. Oddiy so'zlar bilan tasvirlang — AI Studio uni
            professional rasm, video, ovoz va matnga aylantiradi.
          </p>

          <div className="animate-rise mx-auto mt-10 max-w-xl">
            <Link
              to={isAuthenticated ? '/magic' : '/register'}
              className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-[#101018] p-2 pl-5 text-left transition-all hover:border-violet-500/40"
            >
              <span className="flex-1 truncate text-zinc-500">{EXAMPLES[exampleIndex]}</span>
              <span className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-medium text-white transition-transform group-hover:scale-[1.03]">
                Yaratish
              </span>
            </Link>
            <p className="mt-3 text-sm text-zinc-600">Ro'yxatdan o'tganda 10 ta bepul kredit</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <Card key={step.n} className="p-6">
              <span className="text-sm font-mono text-violet-400">{step.n}</span>
              <h3 className="mt-3 font-medium text-white">{step.title}</h3>
              <p className="mt-1.5 text-sm text-zinc-500">{step.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {modules.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-24">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-white">
            Bitta platforma, ko'p modul
          </h2>
          <p className="mt-2 text-center text-zinc-500">
            Qaysi AI ishlatishni siz tanlamaysiz — platforma o'zi hal qiladi.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {modules.map((module) => (
              <Card key={module.module} hover className="p-5 text-center">
                <span className="text-3xl">{module.emoji}</span>
                <h3 className="mt-3 font-medium text-white">{module.label}</h3>
                <p className="mt-1 text-xs text-zinc-500">{module.credits} kredit</p>
                <div className="mt-3">
                  <Badge tone={module.live ? 'success' : 'neutral'}>
                    {module.live ? module.providerLabel : 'Demo rejim'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-5 pb-28">
        <Card className="aura overflow-hidden p-10 text-center sm:p-16">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Siz o'ylang. <span className="gradient-text">AI yaratsin.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-zinc-400">
            Bir daqiqada g'oyadan professional kontentgacha.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button to={isAuthenticated ? '/magic' : '/register'} size="lg">
              {isAuthenticated ? 'Magic Mode' : 'Bepul boshlash'}
            </Button>
            <Button to="/gallery" variant="secondary" size="lg">
              Galereya
            </Button>
          </div>
        </Card>
      </section>

      <footer className="border-t border-white/6 py-8">
        <p className="text-center text-sm text-zinc-600">
          AI Studio — "Say your idea. AI does the rest."
        </p>
      </footer>
    </div>
  );
}
