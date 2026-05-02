import { useEffect, useRef, useState } from 'react';
import { getVideoUrl, getSubtitleUrl } from '../services/api';
import './VideoPlayer.css';

interface VideoPlayerProps {
  tutorialId: string;
  hasSubtitle: boolean;
}

export default function VideoPlayer({ tutorialId, hasSubtitle }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLTrackElement>(null);
  const [subtitleReady, setSubtitleReady] = useState(false);
  const [subtitleFailed, setSubtitleFailed] = useState(false);

  // When subtitles are expected (hasSubtitle=true) but not yet available,
  // poll the subtitle endpoint until it returns successfully, then re-mount
  // the <track> element so the browser picks up the new subtitle file.
  // If the endpoint returns a non-404 error (e.g. 500), generation has
  // permanently failed — stop polling and hide the spinner.
  useEffect(() => {
    if (!hasSubtitle) {
      setSubtitleReady(false);
      setSubtitleFailed(false);
      return;
    }

    let cancelled = false;
    let pollCount = 0;
    const MAX_POLL_ATTEMPTS = 120; // poll for up to ~10 minutes (120 * 5s)

    async function checkSubtitle() {
      while (!cancelled && pollCount < MAX_POLL_ATTEMPTS) {
        try {
          const response = await fetch(getSubtitleUrl(tutorialId));
          if (response.ok) {
            if (!cancelled) {
              setSubtitleReady(true);
            }
            return;
          }
          // Non-404 error (e.g. 500) means generation has permanently failed
          if (response.status !== 404) {
            if (!cancelled) {
              setSubtitleFailed(true);
            }
            return;
          }
        } catch {
          // Network error, retry
        }
        pollCount++;
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    // Start checking immediately
    checkSubtitle();

    return () => {
      cancelled = true;
    };
  }, [tutorialId, hasSubtitle]);

  // When subtitleReady changes, force the <track> element to reload
  // by toggling its src attribute via the DOM.
  useEffect(() => {
    const track = trackRef.current;
    const video = videoRef.current;
    if (!track || !video) return;

    if (subtitleReady) {
      // Re-assign the src to force the browser to load the new track
      track.src = getSubtitleUrl(tutorialId);
      track.track.mode = 'showing';
    }
  }, [subtitleReady, tutorialId]);

  return (
    <div className="video-player">
      <video ref={videoRef} controls preload="metadata" crossOrigin="anonymous">
        <source src={getVideoUrl(tutorialId)} />
        {hasSubtitle && (
          <track
            ref={trackRef}
            key={subtitleReady ? 'sub-ready' : 'sub-pending'}
            kind="subtitles"
            src={subtitleReady ? getSubtitleUrl(tutorialId) : ''}
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
      {hasSubtitle && !subtitleReady && !subtitleFailed && (
        <div className="video-player__subtitle-status">
          Generating subtitles… <span className="video-player__subtitle-spinner" />
        </div>
      )}
      {hasSubtitle && subtitleFailed && (
        <div className="video-player__subtitle-status video-player__subtitle-status--failed">
          Subtitles could not be generated for this video
        </div>
      )}
    </div>
  );
}
