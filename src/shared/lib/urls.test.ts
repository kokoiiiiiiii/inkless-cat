import { describe, expect, it } from 'vitest';

import { normalizeExternalUrl, normalizePhotoDataUrl } from './urls';

describe('external input URL normalization', () => {
  it('normalizes regular website URLs while allowing HTTP and HTTPS', () => {
    expect(normalizeExternalUrl('example.com/profile')).toBe('https://example.com/profile');
    expect(normalizeExternalUrl('http://example.com')).toBe('http://example.com/');
    expect(normalizeExternalUrl('https://example.com')).toBe('https://example.com/');
  });

  it('rejects dangerous protocols and credential-bearing URLs', () => {
    expect(normalizeExternalUrl('javascript:alert(1)')).toBeUndefined();
    expect(normalizeExternalUrl('data:text/html,hello')).toBeUndefined();
    expect(normalizeExternalUrl('https://user:password@example.com')).toBeUndefined();
  });

  it('accepts only bounded local raster image data URLs for photos', () => {
    expect(normalizePhotoDataUrl('data:image/png;base64,aGVsbG8=')).toBe(
      'data:image/png;base64,aGVsbG8=',
    );
    expect(normalizePhotoDataUrl('https://example.com/photo.png')).toBeUndefined();
    expect(normalizePhotoDataUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBeUndefined();
  });
});
