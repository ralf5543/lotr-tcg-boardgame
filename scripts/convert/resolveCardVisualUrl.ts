import fs from 'fs';
import path from 'path';
import { CARD_VISUALS_DIR } from './constants.ts';

/**
 * URL visuelle : préfère le fichier qui existe sur disque.
 * Ordre : webp (léger) → jpg (majoritaire) → png.
 */
export function resolveCardVisualUrl(rawImageCode: string): string {
    const base = `o_${rawImageCode}`;
    for (const ext of ['.webp', '.jpg', '.jpeg', '.png'] as const) {
        if (fs.existsSync(path.join(CARD_VISUALS_DIR, `${base}${ext}`))) {
            const urlExt = ext === '.jpeg' ? '.jpg' : ext;
            return `/cards_visuals/${base}${urlExt}`;
        }
    }
    return `/cards_visuals/${base}.jpg`;
}
