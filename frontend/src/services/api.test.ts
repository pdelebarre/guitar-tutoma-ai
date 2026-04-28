import { describe, it, expect } from 'vitest';
import {
  getVideoUrl,
  getSubtitleUrl,
  getTablatureUrl,
} from './api';

describe('API service URL helpers', () => {
  it('should return correct video URL', () => {
    expect(getVideoUrl('my-tutorial')).toBe(
      '/api/tutorials/my-tutorial/video'
    );
  });

  it('should return correct subtitle URL', () => {
    expect(getSubtitleUrl('my-tutorial')).toBe(
      '/api/tutorials/my-tutorial/subtitle'
    );
  });

  it('should return correct tablature URL', () => {
    expect(getTablatureUrl('my-tutorial')).toBe(
      '/api/tutorials/my-tutorial/tablature'
    );
  });

  it('should encode special characters in tutorial ID', () => {
    expect(getVideoUrl('tutorial with spaces')).toBe(
      '/api/tutorials/tutorial%20with%20spaces/video'
    );
  });
});
