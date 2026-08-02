import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { moduleApi } from '../api/module.api';
import { Icon } from '../components/icons';
import { Button, Card, Badge } from '../components/ui';

const EXAMPLES = [
  'mushuk kosmosda pitsa pishiryapti',
  'Marvel uslubida video yasa',
  'TikTok uchun reklama roligi',
  'brendim uchun Instagram kampaniyasi',
];

const STEPS = [
  { n: '01', title: "G'oyangizni yozing", text: 'Oddiy jumla bilan. Texnik bilim shart emas.' },
  { n: '02', title: 'AI tushunadi', text: "Nima kerakligini o'zi aniqlaydi va rejalashtiradi." },
  { n: '03', title: 'Tayyor natija', text: 'Rasm, video, ovoz, matn — hammasi bir bosishda.' },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [modules, setModules] = useState([]);
  const [exampleIndex, setExampleIndex] = useState(0);

  useEffect(() => {
    moduleApi
      .list()
      .then((res) => setModules(res.data.data))
      .catch(() => setModules([]));
  }, []);

  // Cycles the placeholder so the hero demonstrates the range of requests
  // the platform accepts without needing a video.
  useEffect(() => {
    const id = setInterval(() => setExampleIndex((prev) => (prev + 1) % EXAMPLES.length), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-[#faf7f1]">
      <header className="sticky top-0 z-20 border-b border-[#e8e0d3] bg-[#faf7f1]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#5b45e0] text-white">
              <Icon name="sparkle" size="sm" />
            </span>
            <span className="font-semibold tracking-tight text-[#1c1a17]">AI Studio</span>
          </Link>
          <nav className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button to="/dashboard" size="sm">
                Ilovaga kirish
              </Button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-2 text-sm text-[#6d655a] transition-colors hover:text-[#1c1a17]"
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
        <div className="aura mx-auto max-w-3xl px-5 pb-20 pt-16 text-center sm:pt-24">
          <Badge tone="brand" icon="magic" className="animate-rise">
            Magic Mode — bitta jumla, to'liq natija
          </Badge>

          <h1 className="animate-rise mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-[#1c1a17] sm:text-6xl">
            G'oyangizni ayting.
            <br />
            <span className="gradient-text">Qolganini AI bajaradi.</span>
          </h1>

          <p className="animate-rise mx-auto mt-6 max-w-xl text-lg text-[#6d655a]">
            Prompt yozishni o'rganish shart emas. Oddiy so'zlar bilan tasvirlang — AI Studio uni
            professional rasm, video, ovoz va matnga aylantiradi.
          </p>

          <div className="animate-rise mx-auto mt-9 max-w-xl">
            <Link
              to={isAuthenticated ? '/magic' : '/register'}
              className="group flex items-center gap-3 rounded-2xl border border-[#e8e0d3] bg-white p-2 pl-5 text-left transition-colors hover:border-[#5b45e0]"
            >
              <span className="flex-1 truncate text-[#a1978a]">{EXAMPLES[exampleIndex]}</span>
              <span className="inline-flex items-center gap-2 rounded-xl bg-[#5b45e0] px-5 py-3 text-sm font-medium text-white transition-colors group-hover:bg-[#4733c4]">
                Yaratish
                <Icon name="arrowRight" size="sm" />
              </span>
            </Link>
            <p className="mt-3 text-sm text-[#a1978a]">Ro'yxatdan o'tganda 10 ta bepul kredit</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <Card key={step.n} className="p-6">
              <span className="font-mono text-sm text-[#5b45e0]">{step.n}</span>
              <h3 className="mt-3 font-medium text-[#1c1a17]">{step.title}</h3>
              <p className="mt-1.5 text-sm text-[#6d655a]">{step.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {modules.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 pb-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-[#1c1a17]">
            Bitta platforma, ko'p modul
          </h2>
          <p className="mt-2 text-center text-[#6d655a]">
            Qaysi AI ishlatishni siz tanlamaysiz — platforma o'zi hal qiladi.
          </p>

          <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {modules.map((module) => (
              <Card key={module.module} hover className="flex flex-col items-center p-5 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4efe6] text-[#5b45e0]">
                  <Icon name={module.icon || 'sparkle'} size="lg" />
                </span>
                <h3 className="mt-3 font-medium text-[#1c1a17]">{module.label}</h3>
                <p className="mt-0.5 text-xs text-[#a1978a]">{module.credits} kredit</p>
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

      <section className="mx-auto max-w-5xl px-5 pb-24">
        <Card className="aura overflow-hidden p-10 text-center sm:p-14">
          <h2 className="text-3xl font-semibold tracking-tight text-[#1c1a17]">
            Siz o'ylang. <span className="gradient-text">AI yaratsin.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[#6d655a]">
            Bir daqiqada g'oyadan professional kontentgacha.
          </p>
          <div className="mt-8 flex justify-center">
            <Button to={isAuthenticated ? '/magic' : '/register'} size="lg" icon="magic">
              {isAuthenticated ? 'Magic Mode' : 'Bepul boshlash'}
            </Button>
          </div>
        </Card>
      </section>

      <footer className="border-t border-[#e8e0d3] py-8">
        <p className="text-center text-sm text-[#a1978a]">
          AI Studio — "Say your idea. AI does the rest."
        </p>
      </footer>
    </div>
  );
}
