import type { Ability, CardState, GameState } from '../../types';
import { applyAbilityEffect } from './applyAbilityEffect';
import { canPayAbilityCost, payAbilityCost } from './payAbilityCost';
import { forEachInPlayCard } from './resolveCostTarget';
import { cardMatchesTarget } from '../validations/matchers';
import { resolveWhenPlayed } from './whenPlayed';

export function isYouPlayAbility(ability: Ability): boolean {
    return ability.trigger?.type === 'YOU_PLAY';
}

/**
 * Each time you play a [classe] : cartes déjà en jeu du même camp, pas la carte
 * qu’on vient de jouer (sinon une condition « weather » se déclencherait sur elle-même).
 */
export function resolveEachTimeYouPlay(
    G: GameState,
    playedCard: CardState
): void {
    const playedId = playedCard.instanceId || playedCard.id;
    const playedKind = playedCard.kind;

    forEachInPlayCard(G, (source) => {
        if ((source.instanceId || source.id) === playedId) return;
        if (source.kind !== playedKind) return;

        for (const ability of source.abilities || []) {
            if (!isYouPlayAbility(ability) || ability.optional) continue;
            const trigger = ability.trigger;
            if (!trigger || trigger.type !== 'YOU_PLAY') continue;
            if (!cardMatchesTarget(playedCard, trigger.played)) continue;
            if (!canPayAbilityCost(G, source, ability.cost)) continue;
            if (!payAbilityCost(G, source, ability.cost)) continue;
            applyAbilityEffect(G, source, ability);
        }
    });
}

export function afterCardPlayed(
    G: GameState,
    card: CardState,
    options?: { playerId?: string; phase?: string; skipWhenPlayed?: boolean }
): void {
    if (!options?.skipWhenPlayed) {
        resolveWhenPlayed(G, card, options);
    }
    resolveEachTimeYouPlay(G, card);
}
