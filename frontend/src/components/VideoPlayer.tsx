import { getVideoUrl, getSubtitleUrl } from '../services/api';
import './VideoPlayer.css';

interface VideoPlayerProps {
  tutorialId: string;
  hasSubtitle: boolean;
}

export default function VideoPlayer({ tutorialId, hasSubtitle }: VideoPlayerProps) {
  return (
    <div className="video-player">
      <video controls preload="metadata" crossOrigin="anonymous">
        <source src={getVideoUrl(tutorialId)} />
        {hasSubtitle && (
          <track
            kind="subtitles"
            src={getSubtitleUrl(tutorialId)}
            srcLang="en"
            label="English"
            default
          />
        )}
        {/* Fallback content shown if video cannot load */}
        <div className="video-player__fallback">
          <span className="video-player__fallback-icon" aria-hidden="true">🎬</span>
          <p className="video-player__fallback-text">No video available</p>
        </div>
      </video>
    </div>
  );
}
