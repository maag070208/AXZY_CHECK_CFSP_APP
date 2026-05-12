export type MediaType = 'IMAGE' | 'VIDEO';

export interface IMedia {
  url: string;
  type?: MediaType;
}

/**
 * Normalizes media item and detects type if missing
 */
export const normalizeMedia = (item: any): IMedia | null => {
  if (!item) return null;
  if (typeof item === 'string') {
    const isVideo = item.toLowerCase().match(/\.(mp4|mov|avi|wmv|flv|mkv)$/);
    return {
      url: item,
      type: isVideo ? 'VIDEO' : 'IMAGE',
    };
  }
  
  if (item.url && !item.type) {
    const isVideo = item.url.toLowerCase().match(/\.(mp4|mov|avi|wmv|flv|mkv)$/);
    return {
      ...item,
      type: isVideo ? 'VIDEO' : 'IMAGE',
    };
  }
  
  return item;
};

/**
 * Counts photos and videos in a list
 */
export const getMediaCounts = (media: any[]) => {
  const normalized = (media || []).map(normalizeMedia);
  return {
    photos: normalized.filter(m => m?.type === 'IMAGE').length,
    videos: normalized.filter(m => m?.type === 'VIDEO').length,
    total: normalized.filter(m => m !== null).length,
    normalized
  };
};
