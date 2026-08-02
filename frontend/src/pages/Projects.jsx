import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { projectApi } from '../api/module.api';
import { Button, Card, Badge, Spinner, PageHeader, EmptyState, StatusBadge } from '../components/ui';

function Thumb({ project }) {
  const visual = project.generations.find(
    (asset) => asset.resultUrl && (asset.type === 'IMAGE' || asset.type === 'VIDEO')
  );

  if (!visual) {
    return (
      <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 text-3xl">
        ✨
      </div>
    );
  }

  return visual.type === 'IMAGE' ? (
    <img src={visual.resultUrl} alt={project.title} className="aspect-video w-full object-cover" />
  ) : (
    <video src={visual.resultUrl} className="aspect-video w-full object-cover" muted />
  );
}

export default function Projects() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = async (pageToLoad, replace) => {
    setLoading(true);
    try {
      const res = await projectApi.list(pageToLoad, 12);
      setItems((prev) => (replace ? res.data.data : [...prev, ...res.data.data]));
      setTotalPages(res.data.pagination.totalPages);
      setPage(pageToLoad);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, true);
  }, []);

  return (
    <Layout>
      <PageHeader
        title="Loyihalar"
        subtitle="Magic Mode orqali yaratilgan ishlaringiz"
        action={<Button to="/magic">✨ Yangi loyiha</Button>}
      />

      {loading && items.length === 0 && (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <EmptyState
          title="Hali loyiha yo'q"
          description="Magic Mode'da g'oyangizni yozing — AI qolganini bajaradi."
          action={<Button to="/magic">Magic Mode'ni ochish</Button>}
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((project) => (
          <Link key={project.id} to={`/projects/${project.id}`}>
            <Card hover className="h-full overflow-hidden">
              <Thumb project={project} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 flex-1 truncate font-medium text-white">{project.title}</h3>
                  <StatusBadge status={project.status} />
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm text-zinc-500">{project.userRequest}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge>{project.generations.length} aktiv</Badge>
                  <Badge>◆ {project.creditsUsed}</Badge>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {!loading && page < totalPages && (
        <div className="mt-8 text-center">
          <Button onClick={() => load(page + 1, false)} variant="secondary">
            Ko'proq yuklash
          </Button>
        </div>
      )}
    </Layout>
  );
}
