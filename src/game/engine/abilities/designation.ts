import type { Ability, CardState, GameState } from '../../types';
import { getEffectiveVitality } from '../../../utils/cardStats';
import { resolveCostTarget } from './resolveCostTarget';

export function cardTargetIds(card: CardState): string[] {
    const ids = [card.instanceId, card.id].filter(Boolean);
    return [...new Set(ids)];
}

function uniqueCards(cards: CardState[]): CardState[] {
    const seen = new Set<string>();
    return cards.filter((card) => {
        const key = card.instanceId || card.id;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Cibles payables d’un coût DNF (pas SELF / BEARER).
 * Unique nommé (`[['Sam']]`) comme « un Hobbit » : le joueur désigne toujours
 * (même une seule cible), pour pouvoir annuler.
 * 0 → impossible ; ≥1 → halo + clic.
 */
export function getDesignationCandidates(
    G: GameState,
    source: CardState,
    ability: Ability
): CardState[] {
    const option = (ability.cost || []).find((opt) => {
        const req = opt.exert?.[0];
        if (!req || req.target === 'SELF' || req.target === 'BEARER') {
            return false;
        }
        const count = req.count || 1;
        return resolveCostTarget(G, source, req.target).some(
            (card) => getEffectiveVitality(card) > count
        );
    });

    const req = option?.exert?.[0];
    if (!req || req.target === 'SELF' || req.target === 'BEARER') return [];

    const count = req.count || 1;
    return uniqueCards(
        resolveCostTarget(G, source, req.target).filter(
            (card) => getEffectiveVitality(card) > count
        )
    );
}

export function abilityNeedsDesignation(
    G: GameState,
    source: CardState,
    ability: Ability
): boolean {
    return getDesignationCandidates(G, source, ability).length >= 1;
}

export function formatDesignationPrompt(ability: Ability): string {
    const target = ability.cost[0]?.exert?.[0]?.target;
    if (!Array.isArray(target)) return 'Choisissez une cible.';
    const label = target
        .flat()
        .map((token) => token.charAt(0) + token.slice(1).toLowerCase())
        .join(' ');
    return `Choisissez un ${label}.`;
}
