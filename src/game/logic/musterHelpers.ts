// src/game/helpers/musterHelpers.ts
import type { GameState, CardState } from '../types';

export function getMusterCount(G: GameState, playerId: string): number {
    const player = G.players?.[playerId];
    if (!player) return 0;

    let count = 0;

    // Si c'est l'ID du joueur FP, c'est FP. Sinon, c'est l'Ombre.
    const isFP = playerId === G.fpPlayerId;
    const isShadow = !isFP;

    // 1. Peuples Libres (Zone de Communauté du joueur)
    if (isFP) {
        (player.fellowshipArea || []).forEach((card: CardState) => {
            if (
                card.keywords?.includes('MUSTER') ||
                card.grantsKeywords?.includes('MUSTER')
            ) {
                count++;
            }
        });
    }

    // 2. Ombre (Champ de bataille)
    if (isShadow) {
        (G.battlefield || []).forEach((card: CardState) => {
            if (
                card.keywords?.includes('MUSTER') ||
                card.grantsKeywords?.includes('MUSTER')
            ) {
                count++;
            }
        });
    }

    return count;
}
