import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectApi } from '../../api/module.api';
import MediaThumb from '../MediaThumb';
import { Icon } from '../icons';
import { Button, Card, Badge, Spinner, EmptyState, StatusBadge, CreditPill } from '../ui';

function Cover({ project }) {
  const visual = project.generations.find(
    (asset) => asset.resultUrl && (asset.type === 'IMAGE' || asset.type === 'VIDEO')
  );

  if (!visual) {
    return (
      <div className="flex aspect-video items-center justify-center bg-[#efecff] text-[#5b45e0]">
        <Icon name="magic" size="xl" />
      </div>
    );
  }

  return <MediaThumb generation={visual} ratio="aspect-video" />;
}

export default function ProjectsView() {
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

  if (loading && items.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <EmptyState
        icon="projects"
        title="Hali loyiha yo'q"
        description="Magic Mode'da g'oyangizni yozing — AI qolganini bajaradi."
        action={
          <Button to="/magic" icon="magic">
            Magic Mode
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((project) => (
          <Link key={project.id} to={`/projects/${project.id}`}>
            <Card hover className="h-full overflow-hidden">
              <Cover project={project} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 flex-1 truncate font-medium text-[#1c1a17]">
                    {project.title}
                  </h3>
                  <StatusBadge status={project.status} />
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm text-[#6d655a]">{project.userRequest}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge icon="layers">{project.generations.length} aktiv</Badge>
                  <CreditPill amount={project.creditsUsed} tone="neutral" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {!loading && page < totalPages && (
        <div className="mt-6 text-center">
          <Button onClick={() => load(page + 1, false)} variant="secondary">
            Ko'proq yuklash
          </Button>
        </div>
      )}
    </>
  );
}
