export const DEFAULT_PERSONAL_SETTINGS = {
  showPhoto: true,
  photoSize: 120,
  photoPosition: 'right' as const,
};

export const MIN_PHOTO_SIZE = 80;
export const MAX_PHOTO_SIZE = 260;

export const clampPhotoSize = (value: number): number =>
  Math.max(MIN_PHOTO_SIZE, Math.min(value, MAX_PHOTO_SIZE));
