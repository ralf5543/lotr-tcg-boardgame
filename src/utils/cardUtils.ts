import type { GameState, CardState, SiteCardState } from '../game/types';

/**
 * Recherche une carte par son ID dans l'ensemble des zones du jeu
 */
export function findTargetCard(
    G: GameState,
    targetId: string
): CardState | SiteCardState | null {
    if (!G || !G.players || !targetId) return null;

    // 1. Recherche dans l'aire de chaque joueur (Fellowship & Support)
    for (const pId of Object.keys(G.players)) {
        const player = G.players[pId];
        if (!player) continue;

        const foundInFellowship = player.fellowshipArea?.find((c) => c?.id === targetId);
        if (foundInFellowship) return foundInFellowship;

        const foundInSupport = player.supportArea?.find((c) => c?.id === targetId);
        if (foundInSupport) return foundInSupport;
    }

    // 2. Recherche sur le Champ de Bataille
    const foundInBattlefield = G.battlefield?.find((c) => c?.id === targetId);
    if (foundInBattlefield) return foundInBattlefield;

    // 3. Recherche dans le Path (Sites)
    const foundInPath = G.path?.find((s) => s?.id === targetId);
    if (foundInPath) return foundInPath;

    return null;
}