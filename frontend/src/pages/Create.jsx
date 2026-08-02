import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Icon } from '../components/icons';
import { generationApi } from '../api/generation.api';
import { useAuth } from '../context/AuthContext';
import { Card, Badge, CreditPill } from '../components/ui';

/**
 * The "Yaratish" tab — every way of making something starts here, so the
 * generators themselves never need a place in the tab bar.
 */

const TOOLS = [
  {
    to: '/magic',
    icon: 'magic',
    title: 'Magic Mode',
    description: "Bitta jumla yozing — AI rejalashtiradi va hammasini o'zi yaratadi.",
    featured: true,
  },
  {
    to: '/generate/image',
    icon: 'image',
    title: 'Rasm',
    description: 'Uslub tanlab aniq natija oling.',
    costKey: 'IMAGE',
  },
  {
    to: '/generate/video',
    icon: 'video',
    title: 'Video',
    description: "Sifat darajasini o'zingiz tanlang.",
    costKey: 'VIDEO',
  },
  {
    to: '/remix',
    icon: 'remix',
    title: 'Remix',
    description: "Rasm yuklang — AI uni yangi uslubda qayta chizadi.",
    costKey: 'IMAGE',
  },
];

export default function Create() {
  const { credits } = useAuth();
  const [costs, setCosts] = useState({});

  useEffect(() => {
    generationApi
      .getStyles()
      .then((res) => setCosts(res.data.data.costs || {}))
      .catch(() => setCosts({}));
  }, []);

  const featured = TOOLS.find((tool) => tool.featured);
  const rest = TOOLS.filter((tool) => !tool.featured);

  return (
    <Layout>
      <h1 className="text-2xl font-semibold tracking-tight text-[#1c1a17]">Nima yaratamiz?</h1>
      <p className="mt-1.5 text-[#6d655a]">
        Balansingiz <span className="font-medium text-[#4733c4]">{credits} kredit</span>
      </p>

      <Link to={featured.to} className="mt-6 block">
        <Card hover className="aura group overflow-hidden p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#5b45e0] text-white">
              <Icon name={featured.icon} size="lg" />
            </span>
            <div className="min-w-0 flex-1">
              <Badge tone="brand">Tavsiya etiladi</Badge>
              <h2 className="mt-2 text-lg font-semibold text-[#1c1a17]">{featured.title}</h2>
              <p className="mt-1 text-sm text-[#6d655a]">{featured.description}</p>
            </div>
            <span className="mt-1 text-[#a1978a] transition-transform group-hover:translate-x-0.5">
              <Icon name="chevronRight" size="md" />
            </span>
          </div>
        </Card>
      </Link>

      {/* One row on phones: three tools side by side beats three tall cards
          the user has to scroll past. */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {rest.map((tool) => (
          <Link key={tool.to} to={tool.to}>
            <Card hover className="flex h-full flex-col items-center gap-2 p-4 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4efe6] text-[#5b45e0]">
                <Icon name={tool.icon} size="md" />
              </span>
              <h3 className="text-sm font-medium text-[#1c1a17]">{tool.title}</h3>
              <p className="hidden flex-1 text-xs text-[#6d655a] sm:block">{tool.description}</p>
              {costs[tool.costKey] && <CreditPill amount={costs[tool.costKey]} tone="neutral" />}
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6 flex items-start gap-3 bg-[#f4efe6] p-4">
        <span className="mt-0.5 shrink-0 text-[#a1978a]">
          <Icon name="info" size="md" />
        </span>
        <p className="text-sm text-[#6d655a]">
          Har bir yaratish kredit sarflaydi. Bepul tarifda kuniga 1 ta video va 2 ta rasm
          yaratish mumkin — cheklovsiz ishlatish uchun Pro tarifga o'ting.
        </p>
      </Card>
    </Layout>
  );
}
