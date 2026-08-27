import type { CardState, GameState } from '../types';
import { getEffectiveKeywords } from '../engine/keywords/keywordUtils';

/**
 * Vérifie si une carte possède un mot-clé donné parmi ses mots-clés effectifs.
 */
export function hasKeyword(card: CardState, keywordKey: string): boolean {
    const effective = getEffectiveKeywords(card);
    const keyToFind = keywordKey.toUpperCase();
    return effective.some((k) => k.key === keyToFind);
}

/**
 * Calcul total de la réserve d'archerie pour les FP et pour l'Ombre.
 * Chaque personnage qui possède le mot-clé ARCHER ajoute 1 au total.
 */
export function calculateArcheryTotals(G: GameState) {

    const fpId = G.fpPlayerId || '0';
    const fpPlayer = G.players[fpId];

    let fpTotal = 0;
    if (fpPlayer && fpPlayer.fellowshipArea) {
        fpPlayer.fellowshipArea.forEach((companion) => {
            const isArcher = hasKeyword(companion, 'ARCHER');
            if (isArcher) {
                fpTotal += 1;
            }
        });
    }

    let shadowTotal = 0;
    if (G.battlefield) {
        G.battlefield.forEach((minion) => {
            if (minion.kind === 'SHADOW' && minion.type === 'MINION') {
                const isArcher = hasKeyword(minion, 'ARCHER');
                if (isArcher) {
                    shadowTotal += 1;
                }
            }
        });
    }

    return { fpTotal, shadowTotal };
}