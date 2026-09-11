import type { Ability, CardState, GameState } from '../../types';
import { getEffectiveVitality } from '../../../utils/cardStats';
import { isRingBearerCard } from '../../../utils/cardUtils';
import { resolveAbilityTarget, resolveCostTarget, resolveWinnerTargets } from './resolveCostTarget';
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

export function isHealableCard(card: CardState): boolean {
    return Boolean(card) && !card.isDead && (card.wounds || 0) > 0;
}

function candidatesForEffect(
    G: GameState,
    source: CardState,
    ability: Ability,
    effect: Ability['effects'][number]
): CardState[] {
    if (!('target' in effect)) return [];
    if (effect.target === 'WINNER') {
        return uniqueCards(resolveWinnerTargets(G, source, ability));
    }
    const matches = uniqueCards(resolveCostTarget(G, source, effect.target));
    if (effect.type === 'HEAL') {
        return matches.filter(isHealableCard);
    }
    return matches.filter((card) => !card.isDead);
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

    const winnerEffect = (ability.effects || []).find(
        (item) => 'target' in item && item.target === 'WINNER'
    );
    if (winnerEffect) {
        const matches = candidatesForEffect(G, source, ability, winnerEffect);
        if (matches.length <= 1) return [];
        return matches;
    }

    const effect = (ability.effects || []).find(
        (item) =>
            'target' in item &&
            (Array.isArray(item.target) || item.target === 'SKIRMISHING')
    );
    if (!effect) return [];
    return candidatesForEffect(G, source, ability, effect);
}

export function abilityHasLegalEffectTarget(
    G: GameState,
    source: CardState,
    ability: Ability
): boolean {
    for (const effect of ability.effects || []) {
        if (effect.type === 'MAKE_RING_BEARER') {
            if (isRingBearerCard(source)) return false;
            continue;
        }
        if (!('target' in effect)) continue;
        if (effect.target === 'SELF' || effect.target === 'BEARER') {
            if (effect.type === 'HEAL') {
                const card = resolveAbilityTarget(G, source, effect.target);
                if (!card || !isHealableCard(card)) return false;
            }
            continue;
        }
        if (candidatesForEffect(G, source, ability, effect).length === 0) {
            return false;
        }
    }
    return true;
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
    if (effectTarget === 'SKIRMISHING') {
        return 'Choisissez un personnage au combat.';
    }
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
    const phaseToMatch = G.responseWindow?.isOpen ? 'RESPONSE' : phase || '';
    const ability = findEventAbilityForPhase(card, phaseToMatch);
    if (!ability || !abilityNeedsDesignation(G, card, ability)) return [];
    return getDesignationCandidates(G, card, ability).flatMap(cardTargetIds);
}
