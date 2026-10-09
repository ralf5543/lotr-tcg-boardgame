import type { CardState, GameState } from '../types';
import { getEffectiveKeywords } from '../engine/keywords/keywordUtils';
import { getCurrentSite } from './sites';

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
    const companionCount = fpPlayer?.fellowshipArea?.filter(
        (c) => c && c.type === 'COMPANION' && !c.isDead
    ).length ?? 0;

    if (fpPlayer && fpPlayer.fellowshipArea) {
        fpPlayer.fellowshipArea.forEach((companion) => {
            const isArcher = hasKeyword(companion, 'ARCHER');
            if (isArcher && !companion.omitFromArcheryTotal) {
                fpTotal += 1;
            }
        });
    }

    let shadowTotal = 0;
    if (G.battlefield) {
        G.battlefield.forEach((minion) => {
            if (minion.kind === 'SHADOW' && minion.type === 'MINION') {
                const isArcher = hasKeyword(minion, 'ARCHER');
                if (isArcher && !minion.omitFromArcheryTotal) {
                    shadowTotal += 1;
                }
            }
        });
    }

    // Passifs du site actuel (Anduin Banks…).
    const site = getCurrentSite(G);
    for (const ability of site?.abilities || []) {
        if (ability.trigger?.type !== 'WHILE') continue;
        for (const effect of ability.effects || []) {
            if (effect.type !== 'MODIFY_ARCHERY_TOTAL') continue;
            let bonus = effect.value;
            if (typeof effect.perCompanionOver === 'number') {
                bonus =
                    effect.value *
                    Math.max(0, companionCount - effect.perCompanionOver);
            }
            if (effect.side === 'SHADOW') shadowTotal += bonus;
            else fpTotal += bonus;
        }
    }

    return { fpTotal, shadowTotal };
}