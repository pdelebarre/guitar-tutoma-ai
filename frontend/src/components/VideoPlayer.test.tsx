import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import VideoPlayer from './VideoPlayer';

describe('VideoPlayer', () => {
  it('sets the video src to the correct streaming URL', () => {
    const { container } = render(
      <VideoPlayer tutorialId="my-song" hasSubtitle={false} />
    );

    const source = container.querySelector('source');
    expect(source).not.toBeNull();
    expect(source!.getAttribute('src')).toBe('/api/tutorials/my-song/video');
  });

  it('encodes special characters in the tutorial ID for the video URL', () => {
    const { container } = render(
      <VideoPlayer tutorialId="song with spaces" hasSubtitle={false} />
    );

    const source = container.querySelector('source');
    expect(source!.getAttribute('src')).toBe(
      '/api/tutorials/song%20with%20spaces/video'
    );
  });

  it('renders a subtitle track when hasSubtitle is true', () => {
    const { container } = render(
      <VideoPlayer tutorialId="my-song" hasSubtitle={true} />
    );

    const track = container.querySelector('track');
    expect(track).not.toBeNull();
    expect(track!.getAttribute('kind')).toBe('subtitles');
    expect(track!.getAttribute('src')).toBe(
      '/api/tutorials/my-song/subtitle'
    );
    expect(track!.getAttribute('srclang')).toBe('en');
    expect(track!.getAttribute('label')).toBe('English');
    expect(track!.hasAttribute('default')).toBe(true);
  });

  it('does not render a subtitle track when hasSubtitle is false', () => {
    const { container } = render(
      <VideoPlayer tutorialId="my-song" hasSubtitle={false} />
    );

    const track = container.querySelector('track');
    expect(track).toBeNull();
  });

  it('renders a video element with controls enabled', () => {
    const { container } = render(
      <VideoPlayer tutorialId="my-song" hasSubtitle={false} />
    );

    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video!.hasAttribute('controls')).toBe(true);
  });

  it('sets preload to metadata for efficient loading', () => {
    const { container } = render(
      <VideoPlayer tutorialId="my-song" hasSubtitle={false} />
    );

    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video!.getAttribute('preload')).toBe('metadata');
  });
});
