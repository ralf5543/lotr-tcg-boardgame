import type { Ability, CardState, GameState } from '../../types';
import {
    applyAbilityEffect,
    abilityNeedsSiteReplace,
    abilityNeedsSiteExchange,
    abilityReplaceSiteEffect,
} from './applyAbilityEffect';
import {
    abilityOwnerPlayerId,
    canPayAbilityCost,
    payAbilityCost,
} from './payAbilityCost';
import { findTargetCard } from '../../../utils/cardUtils';
import { pauseActionYieldForResponses } from '../responseWindow';
import {
    canReplaceCurrentSite,
    canReplaceSiteInCurrentRegionForPlayer,
} from '../../logic/siteReplaceRestrictions';
import { canExchangeOwnedPathSite, countSitesWithKeyword } from '../../logic/sites';
import { abilityNeedsEffectDesignation } from './designation';

export function isWhenPlayedAbility(ability: Ability): boolean {
    return ability.trigger?.type === 'WHEN_PLAYED';
}

function whenPlayedSpotSiteMet(G: GameState, ability: Ability): boolean {
    const trigger = ability.trigger;
    if (!trigger || trigger.type !== 'WHEN_PLAYED') return true;
    if (!trigger.spotSiteKeyword) return true;
    const needed = trigger.spotSiteKeyword.count || 1;
    return (
        countSitesWithKeyword(G, trigger.spotSiteKeyword.keyword) >= needed
    );
}

function abilityForPhase(ability: Ability, phase?: string): Ability {
    if (phase === 'fellowship' && !(ability.phases || []).length) {
        return { ...ability, phases: ['FELLOWSHIP'] };
    }
    return ability;
}

function canFulfillWhenPlayedEffects(
    G: GameState,
    card: CardState,
    ability: Ability
): boolean {
    if (!whenPlayedSpotSiteMet(G, ability)) return false;

    const reinforce = (ability.effects || []).find(
        (item) => item.type === 'REINFORCE_CULTURE_TOKEN'
    );
    if (reinforce && reinforce.type === 'REINFORCE_CULTURE_TOKEN') {
        const ownerId = abilityOwnerPlayerId(G, card);
        if (!ownerId) return false;
        // Pas de candidat = effet inerte OK ; on laisse jouer la carte.
        // Plusieurs candidats = désignation (toaster).
        return true;
    }

    if (abilityNeedsSiteExchange(ability)) {
        const ownerId = abilityOwnerPlayerId(G, card);
        if (!ownerId) return false;
        return canExchangeOwnedPathSite(G, ownerId);
    }
    if (!abilityNeedsSiteReplace(ability)) return true;
    const effect = abilityReplaceSiteEffect(ability);
    if (!effect) return false;
    const ownerId = abilityOwnerPlayerId(G, card);
    if (!ownerId) return false;
    if (effect.scope === 'REGION') {
        return canReplaceSiteInCurrentRegionForPlayer(
            G,
            ownerId,
            effect.siteKeyword
        );
    }
    return canReplaceCurrentSite(G, ownerId, effect.siteKeyword);
}

function applyWhenPlayedAbility(
    G: GameState,
    card: CardState,
    ability: Ability,
    phase?: string,
    discardedHandIds?: string[],
    chosenTargetId?: string
): boolean {
    const prepared = abilityForPhase(ability, phase);
    if (!canPayAbilityCost(G, card, prepared.cost)) return false;
    if (!payAbilityCost(G, card, prepared.cost)) return false;
    return applyAbilityEffect(
        G,
        card,
        prepared,
        chosenTargetId,
        discardedHandIds
    );
}

function beginOptionalWhenPlayed(
    G: GameState,
    card: CardState,
    ability: Ability,
    playerId: string,
    phase?: string
): void {
    const sourceInstanceId = card.instanceId || card.id;
    if (!sourceInstanceId) return;

    G.pendingWhenPlayed = {
        playerId,
        sourceInstanceId,
        abilityId: ability.id,
        phase,
    };
    // Texte affiché côté UI via getCardText (langue du joueur), pas ability.text EN.
    G.statusMessage = 'Vous pouvez activer l’effet optionnel de cette carte.';
    pauseActionYieldForResponses(G, playerId);
}

/**
 * « When you play this » :
 * - requis : appliqué tout de suite si le coût est payable ;
 * - optionnel (« you may ») : toaster, le joueur accepte ou passe.
 */
export function resolveWhenPlayed(
    G: GameState,
    card: CardState,
    options?: { playerId?: string; phase?: string }
): void {
    const phase = options?.phase;
    const playerId =
        options?.playerId ||
        (card.kind === 'SHADOW'
            ? G.fpPlayerId === '0'
                ? '1'
                : '0'
            : G.fpPlayerId || '0');

    let firstOptional: Ability | undefined;

    for (const ability of card.abilities || []) {
        if (!isWhenPlayedAbility(ability)) continue;
        if (!whenPlayedSpotSiteMet(G, ability)) continue;

        if (ability.optional) {
            if (
                !firstOptional &&
                canPayAbilityCost(G, card, ability.cost) &&
                canFulfillWhenPlayedEffects(G, card, ability)
            ) {
                firstOptional = ability;
            }
            continue;
        }

        // Reinforce multi-cibles : toaster (désignation) même si requis.
        if (
            abilityNeedsEffectDesignation(G, card, ability) &&
            (ability.effects || []).some(
                (item) => item.type === 'REINFORCE_CULTURE_TOKEN'
            )
        ) {
            if (
                !firstOptional &&
                canPayAbilityCost(G, card, ability.cost)
            ) {
                firstOptional = ability;
            }
            continue;
        }

        applyWhenPlayedAbility(G, card, ability, phase);
    }

    if (firstOptional) {
        beginOptionalWhenPlayed(G, card, firstOptional, playerId, phase);
    }
}

export function acceptPendingWhenPlayed(
    G: GameState,
    playerID: string,
    discardedHandIds?: string[],
    chosenTargetId?: string | string[]
): boolean {
    const pending = G.pendingWhenPlayed;
    if (!pending || pending.playerId !== playerID) return false;

    const source = findTargetCard(
        G,
        pending.sourceInstanceId
    ) as CardState | null;
    const ability = source?.abilities?.find(
        (ab) => ab.id === pending.abilityId
    );
    if (!source || !ability) {
        G.pendingWhenPlayed = undefined;
        return false;
    }

    const applied = applyWhenPlayedAbility(
        G,
        source,
        ability,
        pending.phase,
        discardedHandIds,
        chosenTargetId
    );
    if (!applied) return false;
    G.pendingWhenPlayed = undefined;
    return true;
}

export function declinePendingWhenPlayed(
    G: GameState,
    playerID: string
): boolean {
    const pending = G.pendingWhenPlayed;
    if (!pending || pending.playerId !== playerID) return false;
    G.pendingWhenPlayed = undefined;
    G.statusMessage = 'Effet optionnel refusé.';
    return true;
}
