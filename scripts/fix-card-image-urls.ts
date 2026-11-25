/**
 * Aligne imageUrl (cards.json / sites.json) sur l’extension réelle dans
 * public/cards_visuals — sans relancer tout le convertisseur.
 *
 *   npx tsx scripts/fix-card-image-urls.ts
 */
import fs from 'fs';
import path from 'path';
import {
    CARD_VISUALS_DIR,
    OUTPUT_CARDS_PATH,
    OUTPUT_SITES_PATH,
} from './convert/constants.ts';
import { resolveCardVisualUrl } from './convert/resolveCardVisualUrl.ts';

function patchFile(filePath: string): number {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw) as Array<{ imageUrl?: string }>;
    let changed = 0;

    for (const row of data) {
        const url = row.imageUrl;
        if (!url || !url.startsWith('/cards_visuals/o_')) continue;
        const m = url.match(/^\/cards_visuals\/o_([^./]+)\./);
        if (!m?.[1]) continue;
        const next = resolveCardVisualUrl(m[1]);
        if (next !== url) {
            row.imageUrl = next;
            changed += 1;
        }
    }

    if (changed > 0) {
        fs.writeFileSync(filePath, `${JSON.stringify(data)}\n`, 'utf8');
    }
    return changed;
}

if (!fs.existsSync(CARD_VISUALS_DIR)) {
    console.error('Dossier manquant:', CARD_VISUALS_DIR);
    process.exit(1);
}

const cards = patchFile(OUTPUT_CARDS_PATH);
const sites = patchFile(OUTPUT_SITES_PATH);
console.log(
    `imageUrl corrigés : ${cards} cartes, ${sites} sites (visuels dans ${path.relative(process.cwd(), CARD_VISUALS_DIR)})`
);
