import type { GameState, CardState, SiteCardState } from '../game/types';

/**
 * Recherche une carte par son ID dynamique dans l'ensemble des zones du jeu
 */
export function findTargetCard(
    G: GameState,
    targetId: string
): CardState | SiteCardState | null {
    if (!G || !G.players || !targetId) return null;

    // Helper interne pour comparer id OU instanceId
    const match = (c: CardState | undefined | null) =>
        c && (c.instanceId === targetId || c.id === targetId);

    // 1. Aires des joueurs (Fellowship & Support)
    for (const pId of Object.keys(G.players)) {
        const player = G.players[pId];
        if (!player) continue;

        for (const char of player.fellowshipArea || []) {
            if (match(char)) return char;
            const attached = char.attachments?.find(match);
            if (attached) return attached;
        }

        for (const card of player.supportArea || []) {
            if (match(card)) return card;
            const attached = card.attachments?.find(match);
            if (attached) return attached;
        }
    }

    // 2. Champ de Bataille
    for (const char of G.battlefield || []) {
        if (match(char)) return char;
        const attached = char.attachments?.find(match);
        if (attached) return attached;
    }

    // 3. Path (Sites)
    const foundInPath = G.path?.find((s) => match(s as any));
    if (foundInPath) return foundInPath;

    return null;
}
