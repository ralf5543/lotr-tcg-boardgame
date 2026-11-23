import type { GameState } from '../../game/types';
import { formatJournalNotice } from '../journal';
import type { JournalKey } from '../journal/types';
import { formatStatusNotice } from './format';
import type { StatusKey, StatusParams } from './types';

/**
 * Pose une consigne partagée : clé + params (chaque client traduit).
 * `statusMessage` reste rempli en FR pour journal / outils / repli.
 */
export function setStatus(
    G: GameState,
    key: StatusKey,
    params: StatusParams = {}
): void {
    G.statusNotice = { key, params };
    G.statusMessage = formatStatusNotice('fr', key, params);
}

export function clearStatus(G: GameState, fallback = ''): void {
    G.statusNotice = null;
    G.statusMessage = fallback;
}

/** Message brut (DEV / cas hors catalogue) — pas de clé traduite. */
export function setRawStatus(G: GameState, message: string): void {
    G.statusNotice = null;
    G.statusMessage = message;
}

/**
 * Bandeau = plusieurs faits journal (chaque client formate dans sa langue).
 */
export function setJournalJoinStatus(
    G: GameState,
    entries: Array<{ key: JournalKey; params?: StatusParams }>
): void {
    G.statusNotice = {
        journalJoin: entries.map((e) => ({
            key: e.key,
            params: e.params,
        })),
    };
    G.statusMessage = entries
        .map(
            (e) =>
                formatJournalNotice('fr', e.key, e.params || {}).named
        )
        .join(' ');
}
