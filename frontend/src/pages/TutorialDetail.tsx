import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTutorial } from '../services/api';
import VideoPlayer from '../components/VideoPlayer';
import TablatureViewer from '../components/TablatureViewer';
import CommentPanel from '../components/CommentPanel';
import PreferencePanel from '../components/PreferencePanel';
import type { Tutorial } from '../types';
import './TutorialDetail.css';

export default function TutorialDetail() {
  const { id } = useParams<{ id: string }>();
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoFloating, setVideoFloating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchTutorial() {
      if (!id) {
        setError('No tutorial ID provided.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getTutorial(id);
        if (!cancelled) {
          setTutorial(data);
        }
      } catch {
        if (!cancelled) {
          setError('Tutorial not found or failed to load.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTutorial();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="tutorial-detail page">
        <nav className="tutorial-detail__breadcrumbs">
          <Link to="/" className="tutorial-detail__breadcrumb-link">Library</Link>
          <span className="tutorial-detail__breadcrumb-sep" aria-hidden="true">›</span>
          <span className="tutorial-detail__breadcrumb-current">Loading…</span>
        </nav>
        <div className="tutorial-detail__loading" role="status">
          <div className="tutorial-detail__loading-skeleton">
            <div className="skeleton tutorial-detail__skeleton-title" />
            <div className="skeleton tutorial-detail__skeleton-video" />
            <div className="skeleton tutorial-detail__skeleton-text" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !tutorial) {
    return (
      <div className="tutorial-detail page">
        <nav className="tutorial-detail__breadcrumbs">
          <Link to="/" className="tutorial-detail__breadcrumb-link">Library</Link>
          <span className="tutorial-detail__breadcrumb-sep" aria-hidden="true">›</span>
          <span className="tutorial-detail__breadcrumb-current">Error</span>
        </nav>
        <div className="tutorial-detail__error" role="alert">
          ⚠️ {error || 'Tutorial not found.'}
        </div>
      </div>
    );
  }

  const videoSectionClass = tutorial.hasTablature
    ? `tutorial-detail__section tutorial-detail__video-section${videoFloating ? ' tutorial-detail__video-section--floating' : ''}`
    : 'tutorial-detail__section tutorial-detail__video-section';

  const tablatureSectionClass = tutorial.hasTablature
    ? `tutorial-detail__section tutorial-detail__tablature-section${videoFloating ? ' tutorial-detail__tablature-section--with-floating-video' : ''}`
    : '';

  return (
    <div className="tutorial-detail page">
      <nav className="tutorial-detail__breadcrumbs">
        <Link to="/" className="tutorial-detail__breadcrumb-link">Library</Link>
        <span className="tutorial-detail__breadcrumb-sep" aria-hidden="true">›</span>
        <span className="tutorial-detail__breadcrumb-current">{tutorial.name}</span>
      </nav>

      <h2 className="tutorial-detail__title">{tutorial.name}</h2>

      <div className="tutorial-detail__content">
        <section className={videoSectionClass}>
          <div className="tutorial-detail__section-header">
            <h3 className="tutorial-detail__section-title">Video</h3>
            {tutorial.hasSubtitle && (
              <span className="tutorial-detail__section-badge">Subtitles available</span>
            )}
            {tutorial.hasTablature && (
              <button
                className="tutorial-detail__float-toggle"
                onClick={() => setVideoFloating((prev) => !prev)}
                aria-label={videoFloating ? 'Dock video' : 'Float video over tablature'}
                title={videoFloating ? 'Dock video' : 'Float video over tablature'}
              >
                {videoFloating ? '📌 Dock' : '📺 Float'}
              </button>
            )}
          </div>
          <VideoPlayer tutorialId={tutorial.id} hasSubtitle={tutorial.hasSubtitle} />
        </section>

        {tutorial.hasTablature && (
          <section className={tablatureSectionClass}>
            <div className="tutorial-detail__section-header">
              <h3 className="tutorial-detail__section-title">Tablature</h3>
            </div>
            <TablatureViewer
              tutorialId={tutorial.id}
              hasTablature={tutorial.hasTablature}
            />
          </section>
        )}

        <section className="tutorial-detail__section tutorial-detail__comments-section">
          <CommentPanel tutorialId={tutorial.id} />
        </section>

        <section className="tutorial-detail__section tutorial-detail__preferences-section">
          <PreferencePanel tutorialId={tutorial.id} />
        </section>
      </div>
    </div>
  );
}
