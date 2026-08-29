import type { GameState, PlayerState } from '../types';

/**
 * Vérifie si un joueur possède au moins un Follower éligible et une cible valide avec ressources suffisantes.
 */
export function hasActionableFollowers(
    player: PlayerState,
    G: GameState,
    playerID: string
): boolean {
    if (!player?.supportArea) return false;

    const fpId = G.fpPlayerId || '0';
    const isFP = playerID === fpId;
    const targetType = isFP ? 'COMPANION' : 'MINION';

    // 1. Trouver au moins un personnage cible valide du bon type
    let hasValidTarget = false;

    for (const pId of Object.keys(G.players)) {
        const p = G.players[pId];
        if (!p) continue;

        const candidateList = [...(p.fellowshipArea || []), ...(G.battlefield || [])];
        if (candidateList.some((c) => c.type === targetType && !c.isDead)) {
            hasValidTarget = true;
            break;
        }
    }

    if (!hasValidTarget) return false;

    // 2. Vérifier si au moins un follower a AID et est payable
    return player.supportArea.some((card) => {
        if (
            card.type !== 'FOLLOWER' ||
            !card.keywords?.includes('AID') ||
            !card.aidCost
        ) {
            return false;
        }

        const { type, amount } = card.aidCost;
        if (type === 'TWILIGHT' && !isFP) {
            if ((G.twilightPool || 0) < amount) return false;
        }

        return true;
    });
}