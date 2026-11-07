import type { CardCulture, CardState, GameState } from '../types';
import { getEffectiveVitality } from '../../utils/cardStats';
import { getEffectiveTwilightCost } from '../../utils/roamingDetection';
import { getCurrentSiteIndex } from './sites';
import { getWhileTwilightCostModifier } from './stats/mechanics/whileModifier';
import { applyExert } from '../../utils/applyExert';
import { findTargetCard } from '../../utils/cardUtils';

/** Valeur X du mot-clé `TOIL X` (0 si absent). */
export function getToilAmount(card: CardState): number {
    for (const kw of card.keywords || []) {
        const match = String(kw)
            .toUpperCase()
            .match(/^TOIL\s+(\d+)$/);
        if (match) {
            const n = parseInt(match[1], 10);
            if (Number.isFinite(n) && n > 0) return n;
        }
    }
    return 0;
}

/**
 * Personnages éligibles à l’Éreintement :
 * FP → compagnons de la même culture ; Ombre → séides de la même culture.
 */
export function getToilCandidates(
    G: GameState,
    playerId: string,
    card: CardState
): CardState[] {
    const amount = getToilAmount(card);
    const culture = card.culture as CardCulture | undefined;
    if (!amount || !culture) return [];

    const fpId = G.fpPlayerId || '0';
    const isFpCard = card.kind === 'FREE_PEOPLE';
    const out: CardState[] = [];

    if (isFpCard) {
        if (playerId !== fpId) return [];
        for (const companion of G.players[fpId]?.fellowshipArea || []) {
            if (
                companion &&
                companion.type === 'COMPANION' &&
                companion.culture === culture &&
                !companion.isDead &&
                getEffectiveVitality(companion) > 1
            ) {
                out.push(companion);
            }
        }
        return out;
    }

    if (playerId === fpId) return [];
    for (const minion of G.battlefield || []) {
        if (
            minion &&
            minion.type === 'MINION' &&
            minion.culture === culture &&
            !minion.isDead &&
            getEffectiveVitality(minion) > 1
        ) {
            out.push(minion);
        }
    }
    return out;
}

/** Coût crépuscule après N affaiblissements d’Éreintement. */
export function getTwilightCostWithToil(
    G: GameState,
    card: CardState,
    toilExertCount: number,
    host?: CardState | null
): number {
    const base = getEffectiveTwilightCost(
        card,
        getCurrentSiteIndex(G),
        getWhileTwilightCostModifier(G, card, host)
    );
    const amount = getToilAmount(card);
    if (!amount || toilExertCount <= 0) return Math.max(0, base);
    return Math.max(0, base - amount * toilExertCount);
}

/** Coût minimum jouable (Éreintement max). */
export function getMinimumTwilightCostWithToil(
    G: GameState,
    playerId: string,
    card: CardState
): number {
    const maxExerts = getToilCandidates(G, playerId, card).length;
    return getTwilightCostWithToil(G, card, maxExerts);
}

/**
 * Applique les affaiblissements d’Éreintement. Retourne false si invalide.
 */
export function applyToilExerts(
    G: GameState,
    playerId: string,
    card: CardState,
    toilExertIds: string[] | undefined
): boolean {
    const ids = (toilExertIds || []).filter(Boolean);
    if (ids.length === 0) return true;
    if (getToilAmount(card) <= 0) return false;
    if (new Set(ids).size !== ids.length) return false;

    const candidates = getToilCandidates(G, playerId, card);
    for (const id of ids) {
        const target =
            candidates.find((c) => c.instanceId === id || c.id === id) ||
            (findTargetCard(G, id) as CardState | null);
        if (
            !target ||
            !candidates.some(
                (c) =>
                    (c.instanceId || c.id) === (target.instanceId || target.id)
            )
        ) {
            return false;
        }
        if (getEffectiveVitality(target) <= 1) return false;
        if (!applyExert(G, target)) return false;
    }
    return true;
}
