// src/game/helpers/musterHelpers.ts
import type { GameState, CardState } from '../types';

// Helper interne pour vérifier si la carte a le mot-clé MUSTER
function cardHasMuster(card: CardState): boolean {
    if (!card) return false;

    const hasInKeywords =
        card.keywords?.some((k) => k.startsWith('MUSTER')) ?? false;
    const hasInGranted =
        card.grantsKeywords?.some((k) => k.startsWith('MUSTER')) ?? false;

    return hasInKeywords || hasInGranted;
}

export function getMusterCount(G: GameState, playerId: string): number {
    const player = G.players?.[playerId];
    if (!player) return 0;

    let count = 0;
    const isFP = playerId === G.fpPlayerId;

    // 1. Peuples Libres (Zone de Communauté)
    if (isFP) {
        (player.fellowshipArea || []).forEach((card: CardState) => {
            if (cardHasMuster(card)) count++;
        });
    } else {
        // 2. Ombre (Champ de bataille)
        (G.battlefield || []).forEach((card: CardState) => {
            if (cardHasMuster(card)) count++;
        });
    }

    return count;
}
