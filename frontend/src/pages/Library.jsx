import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import ProjectsView from '../components/library/ProjectsView';
import HistoryView from '../components/library/HistoryView';
import GalleryView from '../components/library/GalleryView';
import { Segmented } from '../components/ui';

/**
 * The "Ishlarim" tab. Projects, history and the public gallery are three
 * views of the same thing — work that exists — so they share one tab instead
 * of eating three slots in the bar.
 *
 * The active view is kept in the URL so a link to a specific view survives a
 * refresh and the browser back button behaves.
 */

const VIEWS = [
  { value: 'projects', label: 'Loyihalar', icon: 'projects' },
  { value: 'history', label: 'Tarix', icon: 'clock' },
  { value: 'gallery', label: 'Galereya', icon: 'gallery' },
];

export default function Library() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromUrl = searchParams.get('view');
  const [view, setView] = useState(
    VIEWS.some((entry) => entry.value === fromUrl) ? fromUrl : 'projects'
  );

  const change = (next) => {
    setView(next);
    setSearchParams(next === 'projects' ? {} : { view: next }, { replace: true });
  };

  return (
    <Layout>
      <h1 className="text-2xl font-semibold tracking-tight text-[#1c1a17]">Ishlarim</h1>

      <div className="mt-4 mb-5 -mx-4 overflow-x-auto px-4">
        <Segmented options={VIEWS} value={view} onChange={change} />
      </div>

      {view === 'projects' && <ProjectsView />}
      {view === 'history' && <HistoryView />}
      {view === 'gallery' && <GalleryView />}
    </Layout>
  );
}
