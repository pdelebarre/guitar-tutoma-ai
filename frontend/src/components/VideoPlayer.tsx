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
        Your browser does not support the video element.
      </video>
    </div>
  );
}
