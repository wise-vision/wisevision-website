// Build-time check for same-origin media (downloaded from the GitHub Release `media-v1` into public/media/ in CI).
import { existsSync } from 'node:fs';
import path from 'node:path';

export const mediaFile = (file: string, root = process.cwd()): boolean => existsSync(path.join(root, 'public', 'media', file));

/** What a video slot can show: 'video' (mp4, maybe with poster), 'poster' (image only) or 'none'. */
export function mediaState(name: string, root?: string): 'video' | 'poster' | 'none' {
  if (mediaFile(`${name}.mp4`, root)) return 'video';
  if (mediaFile(`${name}.poster.jpg`, root)) return 'poster';
  return 'none';
}
