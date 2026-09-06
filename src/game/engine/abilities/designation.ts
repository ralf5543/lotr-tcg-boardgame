import type { Ability, CardState, GameState } from '../../types';
import { getEffectiveVitality } from '../../../utils/cardStats';
import { resolveCostTarget } from './resolveCostTarget';
import { findEventAbilityForPhase } from './playEventAbility';

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
 * Cibles payables d’un coût DNF (pas SELF / BEARER), ou d’un effet
 * qui vise une autre carte (ex. blesser un séide).
 * Unique nommé comme « un Hobbit » / « un séide » : le joueur désigne toujours
 * (même une seule cible), pour pouvoir annuler.
 * 0 → impossible ; ≥1 → halo + flèche (main) ou clic (carte en jeu).
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
    if (req && req.target !== 'SELF' && req.target !== 'BEARER') {
        const count = req.count || 1;
        return uniqueCards(
            resolveCostTarget(G, source, req.target).filter(
                (card) => getEffectiveVitality(card) > count
            )
        );
    }

    const effect = (ability.effects || []).find((item) =>
        Array.isArray(item.target)
    );
    if (!effect || !Array.isArray(effect.target)) return [];
    return uniqueCards(resolveCostTarget(G, source, effect.target));
}

export function abilityNeedsDesignation(
    G: GameState,
    source: CardState,
    ability: Ability
): boolean {
    return getDesignationCandidates(G, source, ability).length >= 1;
}

export function formatDesignationPrompt(ability: Ability): string {
    const costTarget = ability.cost[0]?.exert?.[0]?.target;
    const effectTarget = ability.effects[0]?.target;
    const target = Array.isArray(costTarget)
        ? costTarget
        : Array.isArray(effectTarget)
          ? effectTarget
          : null;
    if (!target) return 'Choisissez une cible.';
    const label = target
        .flat()
        .map((token) => {
            if (token === 'MINION') return 'séide';
            return token.charAt(0) + token.slice(1).toLowerCase();
        })
        .join(' ');
    return `Choisissez un ${label}.`;
}

export function isDesignationTargetId(
    designationTargetIds: string[] | undefined,
    targetId?: string | null
): boolean {
    if (!targetId || !designationTargetIds?.length) return false;
    return designationTargetIds.includes(targetId);
}

export function getHandEventDesignationTargetIds(
    G: GameState,
    card: CardState,
    phase?: string
): string[] {
    const ability = findEventAbilityForPhase(card, phase || '');
    if (!ability || !abilityNeedsDesignation(G, card, ability)) return [];
    return getDesignationCandidates(G, card, ability).flatMap(cardTargetIds);
}
