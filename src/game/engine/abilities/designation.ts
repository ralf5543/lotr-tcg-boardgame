import type {
    Ability,
    CardState,
    CostSelector,
    GameState,
    SiteCardState,
} from '../../types';
import { getEffectiveVitality } from '../../../utils/cardStats';
import { isRingBearerCard } from '../../../utils/cardUtils';
import {
    resolveAbilityTarget,
    resolveCostTarget,
    resolveWinnerTargets,
    resolveSkirmishingOpponents,
} from './resolveCostTarget';
import { findEventAbilityForPhase } from './playEventAbility';

import { findSkirmishToCancel } from './cancelSkirmish';
import { countFromSpotCost, abilityReplaceSiteEffect, abilityExchangeSiteEffect } from './applyAbilityEffect';
import {
    getReplaceSiteCandidates,
    getReplaceablePathSitesInCurrentRegion,
    getOwnedPathSites,
    canExchangeOwnedPathSite,
    canTakeControlOfASite,
    canLiberateASite,
    getSitesControlledBy,
    isCardStackedOnControlledSite,
    findStackedCardSite,
    getCurrentSiteIndex,
    getStackedMinionsOnControlledSites,
} from '../../logic/sites';
import { getEffectiveTwilightCost } from '../../../utils/roamingDetection';
import { getWhileTwilightCostModifier } from '../../logic/stats/mechanics/whileModifier';
import {
    canReplaceCurrentSite,
    canReplaceSiteInCurrentRegionForPlayer,
    isSiteReplaceForbidden,
} from '../../logic/siteReplaceRestrictions';
import { abilityOwnerPlayerId } from './payAbilityCost';
import {
    canReinforce,
    findInPlayCardOwnerId,
    getActiveCardsWithCultureTokens,
    getReinforceCandidates,
    tokenCountOnCard,
} from '../../logic/cultureTokens';
import {
    getCardsStackedOnHost,
    getHandStackCandidates,
    getPlayStackCandidates,
} from '../../logic/cardStack';
import { getDeckOrDiscardPlayCandidates } from '../../logic/playFromOutOfPlay';
import {
    attachesToSite,
    canAttachToCharacter,
} from '../canPlayCard';

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
    if (effect.type === 'STACK_ON_SELF') {
        const ownerId = abilityOwnerPlayerId(G, source);
        if (!ownerId) return [];
        if (
            typeof effect.maxStacked === 'number' &&
            (source.stacked?.length || 0) >= effect.maxStacked
        ) {
            return [];
        }
        if (effect.target === 'WINNER') {
            return uniqueCards(resolveWinnerTargets(G, source, ability));
        }
        if (effect.from === 'HAND') {
            return uniqueCards(
                getHandStackCandidates(G, ownerId, effect.target)
            );
        }
        return uniqueCards(
            getPlayStackCandidates(G, effect.target).filter(
                (card) => findInPlayCardOwnerId(G, card) === ownerId
            )
        );
    }
    if (effect.type === 'TAKE_FROM_STACK') {
        return uniqueCards(getCardsStackedOnHost(source));
    }
    if (effect.type === 'PLAY_FROM_CARD_STACK') {
        const siteIndex = getCurrentSiteIndex(G);
        return uniqueCards(
            getCardsStackedOnHost(source, effect.target).filter((card) => {
                const cost = getEffectiveTwilightCost(
                    card,
                    siteIndex,
                    getWhileTwilightCostModifier(G, card)
                );
                return (G.twilightPool || 0) >= cost;
            })
        );
    }
    if (!('target' in effect)) return [];
    if (effect.target === 'WINNER') {
        return uniqueCards(resolveWinnerTargets(G, source, ability));
    }
    let matches = uniqueCards(resolveCostTarget(G, source, effect.target));
    if (effect.type === 'STACK_ON_CONTROLLED_SITE') {
        const sourceId = source.instanceId || source.id;
        // « Stack a besieger to make this strength +N » : pas soi-même.
        const alsoBuffsSelf = (ability.effects || []).some(
            (item) =>
                item.type === 'ADD_TEMP_STAT' && item.target === 'SELF'
        );
        return matches.filter(
            (card) =>
                card.type === 'MINION' &&
                card.kind === 'SHADOW' &&
                !card.isDead &&
                !(
                    alsoBuffsSelf &&
                    (card.instanceId || card.id) === sourceId
                ) &&
                Boolean(
                    (G.battlefield || []).some(
                        (c) =>
                            c &&
                            (c.instanceId === card.instanceId ||
                                c.id === card.id)
                    )
                )
        );
    }
    if (effect.type === 'PLAY_FROM_STACK' && Array.isArray(effect.target)) {
        const ownerId = abilityOwnerPlayerId(G, source);
        if (!ownerId) return [];
        const reduce = effect.twilightReduce || 0;
        const siteIndex = getCurrentSiteIndex(G);
        return getStackedMinionsOnControlledSites(
            G,
            ownerId,
            effect.target
        ).filter((card) => {
            const cost = Math.max(
                0,
                getEffectiveTwilightCost(
                    card,
                    siteIndex,
                    getWhileTwilightCostModifier(G, card)
                ) - reduce
            );
            return (G.twilightPool || 0) >= cost;
        });
    }
    if (
        effect.type === 'ADD_TEMP_STAT' &&
        effect.excludeSource
    ) {
        const sourceId = source.instanceId || source.id;
        matches = matches.filter(
            (card) => (card.instanceId || card.id) !== sourceId
        );
    }
    if (effect.type === 'WOUND' && effect.excludeRingBearer) {
        matches = matches.filter((card) => !isRingBearerCard(card));
    }
    if (effect.type === 'EXHAUST' && effect.excludeRingBearer) {
        matches = matches.filter((card) => !isRingBearerCard(card));
    }
    if (effect.type === 'EXERT') {
        const need = effect.count || 1;
        return matches.filter(
            (card) => !card.isDead && getEffectiveVitality(card) > need
        );
    }
    if (effect.type === 'EXHAUST') {
        return matches.filter(
            (card) => !card.isDead && getEffectiveVitality(card) > 1
        );
    }
    if (effect.type === 'HEAL') {
        return matches.filter(isHealableCard);
    }
    return matches.filter((card) => !card.isDead);
}

/**
 * Cibles d’un coût à désigner (exert / défausse DNF, pas SELF / BEARER).
 * Unique nommé : le joueur désigne toujours (même une seule cible), pour pouvoir annuler.
 * 0 → impossible ; ≥1 → halo + flèche (main) ou clic (carte en jeu).
 */
export function getCostDesignationCandidates(
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

    // Spot à désigner uniquement si l’exert est SELF / BEARER
    // (Saruman : affaiblir soi + désigner un séide). Sinon le spot DESIGNATION
    // d’événement (Can You Protect Me…) reste géré via la désignation d’effet.
    const spotWithSelfExert = (ability.cost || []).find((opt) => {
        const exertSelf = opt.exert?.some(
            (e) => e.target === 'SELF' || e.target === 'BEARER'
        );
        if (!exertSelf) return false;
        return opt.spot?.some(
            (s) => Array.isArray(s.target) && s.mode === 'DESIGNATION'
        );
    });
    const spotReq = spotWithSelfExert?.spot?.find(
        (s) => Array.isArray(s.target) && s.mode === 'DESIGNATION'
    );
    if (spotReq && Array.isArray(spotReq.target)) {
        return uniqueCards(
            resolveCostTarget(G, source, spotReq.target).filter(
                (card) => !card.isDead
            )
        );
    }

    const discardReq = (ability.cost || [])
        .flatMap((opt) => opt.discardFromPlay || [])
        .find((item) => Array.isArray(item.target));
    if (discardReq && Array.isArray(discardReq.target)) {
        const sourceId = source.instanceId || source.id;
        return uniqueCards(
            resolveCostTarget(G, source, discardReq.target).filter((card) => {
                if (card.isDead) return false;
                if (
                    discardReq.excludeSource &&
                    (card.instanceId === sourceId || card.id === sourceId)
                ) {
                    return false;
                }
                return true;
            })
        );
    }

    const removeTokens = (ability.cost || []).find(
        (opt) =>
            opt.removeCultureTokens &&
            opt.removeCultureTokens.from !== 'SELF'
    )?.removeCultureTokens;
    if (removeTokens) {
        const pool = getActiveCardsWithCultureTokens(
            G,
            removeTokens.culture,
            removeTokens.count
        );
        // Toujours désigner (même 1 carte) : étape halo avant la flèche d’effet.
        if (pool.length < 1) return [];
        return uniqueCards(pool);
    }

    return [];
}

export function getEffectDesignationCandidates(
    G: GameState,
    source: CardState,
    ability: Ability
): CardState[] {
    const winnerEffect = (ability.effects || []).find(
        (item) => 'target' in item && item.target === 'WINNER'
    );
    if (winnerEffect) {
        const matches = candidatesForEffect(G, source, ability, winnerEffect);
        if (matches.length <= 1) return [];
        return matches;
    }

    const reinforce = (ability.effects || []).find(
        (item) => item.type === 'REINFORCE_CULTURE_TOKEN'
    );
    if (reinforce && reinforce.type === 'REINFORCE_CULTURE_TOKEN') {
        const ownerId = abilityOwnerPlayerId(G, source);
        if (!ownerId) return [];
        const matches = getReinforceCandidates(
            G,
            ownerId,
            reinforce.culture
        );
        // Toujours désigner (≥ 1) : UX annulation / confirmation même à une cible.
        if (matches.length < 1) return [];
        return uniqueCards(matches);
    }

    const stackOnSelf = (ability.effects || []).find(
        (item) => item.type === 'STACK_ON_SELF'
    );
    if (stackOnSelf && stackOnSelf.type === 'STACK_ON_SELF') {
        const matches = candidatesForEffect(G, source, ability, stackOnSelf);
        if (matches.length < 1) return [];
        return matches;
    }

    const takeFromStack = (ability.effects || []).find(
        (item) => item.type === 'TAKE_FROM_STACK'
    );
    if (takeFromStack && takeFromStack.type === 'TAKE_FROM_STACK') {
        const matches = candidatesForEffect(G, source, ability, takeFromStack);
        if (matches.length < 1) return [];
        return matches;
    }

    const playFromCardStack = (ability.effects || []).find(
        (item) => item.type === 'PLAY_FROM_CARD_STACK'
    );
    if (playFromCardStack && playFromCardStack.type === 'PLAY_FROM_CARD_STACK') {
        const matches = candidatesForEffect(
            G,
            source,
            ability,
            playFromCardStack
        );
        if (matches.length < 1) return [];
        return matches;
    }

    // Pioche / défausse : pas de halo plateau (overlay dédié).
    if (
        (ability.effects || []).some(
            (item) => item.type === 'PLAY_FROM_DECK_OR_DISCARD'
        )
    ) {
        return [];
    }

    const forceAssign = (ability.effects || []).find(
        (item) => item.type === 'FORCE_ASSIGN'
    );
    if (forceAssign && forceAssign.type === 'FORCE_ASSIGN') {
        return candidatesForEffect(G, source, ability, {
            type: 'WOUND',
            count: 1,
            target: forceAssign.companion,
            excludeRingBearer: forceAssign.excludeRingBearer,
        });
    }

    const forbidAssign = (ability.effects || []).find(
        (item) => item.type === 'FORBID_ASSIGN'
    );
    if (forbidAssign && forbidAssign.type === 'FORBID_ASSIGN') {
        return candidatesForEffect(G, source, ability, {
            type: 'WOUND',
            count: 1,
            target: forbidAssign.target,
        });
    }

    const returnHand = (ability.effects || []).find(
        (item) => item.type === 'RETURN_TO_HAND'
    );
    if (returnHand && returnHand.type === 'RETURN_TO_HAND') {
        return candidatesForEffect(G, source, ability, {
            type: 'WOUND',
            count: 1,
            target: returnHand.target,
        });
    }

    const woundInvolving = (ability.effects || []).find(
        (item) => item.type === 'WOUND' && item.involving
    );
    if (woundInvolving && woundInvolving.type === 'WOUND' && woundInvolving.involving) {
        const fighters = resolveCostTarget(
            G,
            source,
            woundInvolving.involving
        );
        const opponents: CardState[] = [];
        for (const fighter of fighters) {
            for (const opp of resolveSkirmishingOpponents(G, fighter)) {
                if (
                    !opponents.some(
                        (o) =>
                            (o.instanceId || o.id) ===
                            (opp.instanceId || opp.id)
                    )
                ) {
                    opponents.push(opp);
                }
            }
        }
        return opponents.filter((c) => !c.isDead);
    }

    // DISCARD_ALL / EXERT all (et masses) : pas de désignation — on applique tout d’un coup.
    const effect = (ability.effects || []).find(
        (item) =>
            item.type !== 'DISCARD_ALL' &&
            item.type !== 'PLAY_FROM_DECK_OR_DISCARD' &&
            !(item.type === 'EXERT' && item.all) &&
            'target' in item &&
            (Array.isArray(item.target) || item.target === 'SKIRMISHING')
    );
    if (!effect) return [];
    return candidatesForEffect(G, source, ability, effect);
}

export function getDesignationCandidates(
    G: GameState,
    source: CardState,
    ability: Ability
): CardState[] {
    const cost = getCostDesignationCandidates(G, source, ability);
    if (cost.length > 0) return cost;
    return getEffectDesignationCandidates(G, source, ability);
}

export function abilityNeedsCostDesignation(
    G: GameState,
    source: CardState,
    ability: Ability
): boolean {
    return getCostDesignationCandidates(G, source, ability).length >= 1;
}

export function abilityNeedsEffectDesignation(
    G: GameState,
    source: CardState,
    ability: Ability
): boolean {
    return getEffectDesignationCandidates(G, source, ability).length >= 1;
}

/**
 * Effets « trajectoire » (dirigés : blessure / exhaust / soin…) : flèche agent → cible.
 * Pas pour reinforce / place de jetons (neutre : halo + clic seulement).
 */
export function abilityEffectWantsTargetingArrow(ability: Ability): boolean {
    return (ability.effects || []).some(
        (effect) =>
            effect.type === 'EXHAUST' ||
            effect.type === 'WOUND' ||
            effect.type === 'FORCE_ASSIGN' ||
            effect.type === 'FORBID_ASSIGN' ||
            effect.type === 'EXERT' ||
            effect.type === 'HEAL'
    );
}

/** Désignation d’effet neutre (reinforce…) : jamais de flèche pendant le drag main. */
function abilityEffectDesignationIsHaloOnly(ability: Ability): boolean {
    if (abilityEffectWantsTargetingArrow(ability)) return false;
    return (ability.effects || []).some(
        (effect) =>
            effect.type === 'REINFORCE_CULTURE_TOKEN' ||
            effect.type === 'STACK_ON_SELF' ||
            effect.type === 'TAKE_FROM_STACK' ||
            effect.type === 'PLAY_FROM_CARD_STACK'
    );
}

/** Nombre de cibles d’effet à désigner (1, ou min(X, blessés) si multiFromSpot). */
export function getEffectDesignationCount(
    G: GameState,
    source: CardState,
    ability: Ability
): number {
    const heal = (ability.effects || []).find(
        (item) => item.type === 'HEAL' && item.multiFromSpot
    );
    if (heal && heal.type === 'HEAL') {
        const spot = countFromSpotCost(G, source, ability);
        const available = candidatesForEffect(G, source, ability, heal).length;
        return Math.min(Math.max(0, spot), available);
    }
    return 1;
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
        if (effect.type === 'DISCARD_ALL') {
            continue;
        }
        if (effect.type === 'CHOOSE_ONE') {
            continue;
        }
        if (effect.type === 'DISCARD_FROM_HAND') {
            continue;
        }
        if (effect.type === 'REPLACE_SITE') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            if (effect.scope === 'REGION') {
                if (
                    !canReplaceSiteInCurrentRegionForPlayer(
                        G,
                        ownerId,
                        effect.siteKeyword
                    )
                ) {
                    return false;
                }
                continue;
            }
            if (
                !canReplaceCurrentSite(G, ownerId, effect.siteKeyword)
            ) {
                return false;
            }
            continue;
        }
        if (effect.type === 'PLAY_NEXT_SITE') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            if (getReplaceSiteCandidates(G, ownerId).length === 0) {
                return false;
            }
            continue;
        }
        if (effect.type === 'FORCE_ASSIGN') {
            continue;
        }
        if (effect.type === 'FORBID_ASSIGN') {
            if (candidatesForEffect(G, source, ability, effect).length < 1) {
                return false;
            }
            continue;
        }
        if (effect.type === 'RETURN_TO_HAND') {
            if (candidatesForEffect(G, source, ability, effect).length < 1) {
                return false;
            }
            continue;
        }
        if (effect.type === 'EXCHANGE_SITE') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            if (!canExchangeOwnedPathSite(G, ownerId)) return false;
            continue;
        }
        if (effect.type === 'TAKE_CONTROL_SITE') {
            if (!canTakeControlOfASite(G)) return false;
            continue;
        }
        if (effect.type === 'FORCE_CHOOSE_MOVE_AGAIN') {
            continue;
        }
        if (effect.type === 'LIBERATE_SITE') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            if (!canLiberateASite(G, ownerId)) return false;
            continue;
        }
        if (effect.type === 'STACK_ON_CONTROLLED_SITE') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            if (getSitesControlledBy(G, ownerId).length === 0) return false;
            if (Array.isArray(effect.target)) {
                if (candidatesForEffect(G, source, ability, effect).length < 1) {
                    return false;
                }
                continue;
            }
            if (findStackedCardSite(G, source.instanceId || source.id)) {
                return false;
            }
            continue;
        }
        if (
            effect.type === 'STACK_ON_SELF' ||
            effect.type === 'TAKE_FROM_STACK' ||
            effect.type === 'PLAY_FROM_CARD_STACK'
        ) {
            if (candidatesForEffect(G, source, ability, effect).length < 1) {
                return false;
            }
            continue;
        }
        if (effect.type === 'PLAY_FROM_DECK_OR_DISCARD') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const attachHost =
                effect.attachTo === 'SELF' ? source : null;
            if (
                getDeckOrDiscardPlayCandidates(
                    G,
                    ownerId,
                    effect.target,
                    'fellowship',
                    attachHost
                ).length < 1
            ) {
                return false;
            }
            continue;
        }
        if (effect.type === 'PLAY_FROM_STACK') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            if (Array.isArray(effect.target)) {
                if (candidatesForEffect(G, source, ability, effect).length < 1) {
                    return false;
                }
                continue;
            }
            if (!isCardStackedOnControlledSite(G, source, ownerId)) {
                return false;
            }
            const reduce = effect.twilightReduce || 0;
            const cost = Math.max(
                0,
                getEffectiveTwilightCost(
                    source,
                    getCurrentSiteIndex(G),
                    getWhileTwilightCostModifier(G, source)
                ) - reduce
            );
            if ((G.twilightPool || 0) < cost) return false;
            continue;
        }
        if (
            effect.type === 'REMOVE_TWILIGHT' ||
            effect.type === 'REMOVE_BURDENS' ||
            effect.type === 'REMOVE_THREATS' ||
            effect.type === 'ADD_THREATS'
        ) {
            continue;
        }
        if (effect.type === 'REINFORCE_CULTURE_TOKEN') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            if (
                !canReinforce(
                    G,
                    ownerId,
                    effect.culture,
                    effect.count || 1
                )
            ) {
                return false;
            }
            continue;
        }
        if (effect.type === 'CANCEL_SKIRMISH') {
            if (!findSkirmishToCancel(G, source, effect.involving)) {
                return false;
            }
            continue;
        }
        if (effect.type === 'HEAL' && effect.multiFromSpot) {
            if (candidatesForEffect(G, source, ability, effect).length < 1) {
                return false;
            }
            continue;
        }
        if (!('target' in effect)) continue;
        if (effect.target === 'SELF' || effect.target === 'BEARER') {
            if (effect.type === 'HEAL') {
                const card = resolveAbilityTarget(G, source, effect.target);
                if (!card || !isHealableCard(card)) return false;
            }
            if (effect.type === 'REMOVE_CULTURE_TOKEN') {
                const card = resolveAbilityTarget(G, source, effect.target);
                if (
                    !card ||
                    tokenCountOnCard(card, effect.culture) <
                        (effect.count || 1)
                ) {
                    return false;
                }
            }
            if (effect.type === 'PLACE_CULTURE_TOKEN') {
                const card = resolveAbilityTarget(G, source, effect.target);
                if (!card) return false;
            }
            if (effect.type === 'ADD_TEMP_STAT' && effect.limit != null) {
                const used = (G.tempModifiers || [])
                    .filter((mod) => mod.id.startsWith(`${ability.id}:`))
                    .reduce((sum, mod) => sum + mod.value, 0);
                if (used + effect.value > effect.limit) return false;
            }
            if (
                effect.type === 'ADD_TEMP_STAT' &&
                effect.perCultureTokensOnSelf
            ) {
                if (
                    tokenCountOnCard(
                        source,
                        effect.perCultureTokensOnSelf.culture
                    ) < 1
                ) {
                    return false;
                }
            }
            continue;
        }
        if (effect.type === 'ADD_TEMP_STAT' && effect.limit != null) {
            const used = (G.tempModifiers || [])
                .filter((mod) => mod.id.startsWith(`${ability.id}:`))
                .reduce((sum, mod) => sum + mod.value, 0);
            if (used + effect.value > effect.limit) return false;
        }
        if (
            effect.type === 'ADD_TEMP_STAT' &&
            effect.perCultureTokensOnSelf &&
            tokenCountOnCard(
                source,
                effect.perCultureTokensOnSelf.culture
            ) < 1
        ) {
            return false;
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
    return (
        abilityNeedsCostDesignation(G, source, ability) ||
        abilityNeedsEffectDesignation(G, source, ability)
    );
}

export function formatDesignationPrompt(
    ability: Ability,
    which: 'cost' | 'effect' | 'auto' = 'auto'
): string {
    const costTarget = ability.cost[0]?.exert?.[0]?.target;
    const discardTarget = ability.cost[0]?.discardFromPlay?.[0]?.target;
    const effectTarget =
        ability.effects.find(
            (item) =>
                'target' in item &&
                (Array.isArray(item.target) ||
                    item.target === 'SKIRMISHING' ||
                    item.target === 'WINNER')
        )?.target ?? ability.effects[0]?.target;

    const removeTokensCost = ability.cost?.[0]?.removeCultureTokens;
    const hasCostDesignation =
        Array.isArray(costTarget) ||
        Array.isArray(discardTarget) ||
        Boolean(removeTokensCost && removeTokensCost.from !== 'SELF');

    const useEffect =
        which === 'effect' || (which === 'auto' && !hasCostDesignation);

    if (
        (which === 'cost' || (which === 'auto' && hasCostDesignation)) &&
        removeTokensCost &&
        removeTokensCost.from !== 'SELF'
    ) {
        return 'Choisissez une carte dont retirer un jeton.';
    }

    if (useEffect && effectTarget === 'SKIRMISHING') {
        return 'Choisissez un personnage au combat.';
    }
    if (
        useEffect &&
        (ability.effects || []).some(
            (item) => item.type === 'REINFORCE_CULTURE_TOKEN'
        )
    ) {
        return 'Choisissez une carte à renforcer.';
    }
    if (
        useEffect &&
        (ability.effects || []).some(
            (item) =>
                item.type === 'STACK_ON_SELF' && item.from === 'HAND'
        )
    ) {
        return 'Choisissez une carte de votre main à empiler.';
    }
    const target = useEffect
        ? Array.isArray(effectTarget)
            ? effectTarget
            : null
        : Array.isArray(costTarget)
          ? costTarget
          : Array.isArray(discardTarget)
            ? discardTarget
            : Array.isArray(effectTarget)
              ? effectTarget
              : null;
    if (!target) return 'Choisissez une cible.';
    const tokens = target.flat();
    if (tokens.includes('PIPEWEED')) {
        return 'Choisissez une herbe à pipe.';
    }
    const signetToken = tokens.find((token) =>
        token.toUpperCase().startsWith('SIGNET_')
    );
    if (signetToken) {
        const signet = signetToken.replace(/^SIGNET_/i, '');
        const label =
            signet.charAt(0) + signet.slice(1).toLowerCase();
        return `Choisissez un compagnon au sceau ${label}.`;
    }
    const healMulti = (ability.effects || []).some(
        (item) => item.type === 'HEAL' && item.multiFromSpot
    );
    if (healMulti && useEffect) {
        return 'Choisissez les compagnons à soigner.';
    }
    const label = tokens
        .map((token) => {
            if (token === 'MINION') return 'séide';
            if (token === 'PIPE') return 'pipe';
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

/** Sites du path ciblables pour REPLACE REGION ou EXCHANGE (1ʳᵉ cible d’un event). */
export function getPathThenDeckSiteTargetIds(
    G: GameState,
    source: CardState,
    ability: Ability
): string[] {
    const ownerId = abilityOwnerPlayerId(G, source);
    if (!ownerId) return [];

    const exchange = abilityExchangeSiteEffect(ability);
    if (exchange) {
        return getOwnedPathSites(G, ownerId)
            .filter(
                ({ site }) =>
                    getReplaceSiteCandidates(G, ownerId, undefined, site.id)
                        .length > 0
            )
            .flatMap(({ site }) =>
                [site.instanceId, site.id].filter(Boolean) as string[]
            );
    }

    const effect = abilityReplaceSiteEffect(ability);
    if (!effect || effect.scope !== 'REGION') return [];

    return getReplaceablePathSitesInCurrentRegion(G)
        .filter(
            ({ site, pathIndex }) =>
                !isSiteReplaceForbidden(G, ownerId, pathIndex) &&
                getReplaceSiteCandidates(
                    G,
                    ownerId,
                    effect.siteKeyword,
                    site.id
                ).length > 0
        )
        .flatMap(({ site }) =>
            [site.instanceId, site.id].filter(Boolean) as string[]
        );
}

/** @deprecated alias — préférer getPathThenDeckSiteTargetIds */
export function getRegionReplacePathSiteTargetIds(
    G: GameState,
    source: CardState,
    ability: Ability
): string[] {
    return getPathThenDeckSiteTargetIds(G, source, ability);
}

/**
 * Coût et effet désignent la même « classe » de cibles (ex. affaiblir un Hobbit
 * pour le renforcer) → une seule flèche depuis la main.
 * Sinon (ranger → séide) → chaîne TargetingContext après le drop.
 */
export function costAndEffectShareHandDesignation(ability: Ability): boolean {
    const costTarget = ability.cost?.[0]?.exert?.[0]?.target;
    const discardTarget = ability.cost?.[0]?.discardFromPlay?.[0]?.target;
    const costRef = Array.isArray(costTarget)
        ? costTarget
        : Array.isArray(discardTarget)
          ? discardTarget
          : null;
    const effect = (ability.effects || []).find(
        (item) =>
            'target' in item &&
            (Array.isArray(item.target) || item.target === 'SKIRMISHING')
    );
    if (!costRef || !effect || !('target' in effect)) return false;
    if (effect.target === 'SKIRMISHING') return false;
    if (!Array.isArray(effect.target)) return false;
    return JSON.stringify(costRef) === JSON.stringify(effect.target);
}

/**
 * Cibles pour drag d’event depuis la main (flèche + halo).
 * Inclut désignation classique et sites path pour replace REGION / exchange.
 *
 * Coût + effet sur des cibles différentes (ex. exert ranger → exhaust minion) :
 * pas de flèche-main — le drop déclenche la chaîne TargetingContext.
 */
export function getHandEventDesignationTargetIds(
    G: GameState,
    card: CardState,
    phase?: string
): string[] {
    const phaseToMatch = G.responseWindow?.isOpen ? 'RESPONSE' : phase || '';
    const ability = findEventAbilityForPhase(card, phaseToMatch);
    if (!ability) return [];

    // Coût à désigner (remove jeton, exert…) : jamais de flèche pendant le drag.
    // Drop → halo coût → clic ; puis flèche seulement si effet dirigé.
    // Couvre aussi coût-only (Sauron’s Might : remove → add threat).
    if (abilityNeedsCostDesignation(G, card, ability)) {
        return [];
    }

    // Reinforce (etc.) : pas de flèche pendant le drag — le drop ouvre halo + clic.
    if (
        abilityNeedsEffectDesignation(G, card, ability) &&
        abilityEffectDesignationIsHaloOnly(ability)
    ) {
        return [];
    }

    if (abilityNeedsDesignation(G, card, ability)) {
        return getDesignationCandidates(G, card, ability).flatMap(cardTargetIds);
    }

    const pathIds = getPathThenDeckSiteTargetIds(G, card, ability);
    if (pathIds.length > 0) return [...new Set(pathIds)];

    return [];
}

/** Coût toPlay.exert nommé (ex. affaiblir un séide Isengard pour Neiges). */
export function getToPlayExertRequirement(
    card: CardState
): { count: number; target: CostSelector } | null {
    const toPlay = card.toPlay;
    if (!Array.isArray(toPlay)) return null;
    for (const option of toPlay) {
        const req = option.exert?.[0];
        if (!req || req.target === 'SELF' || req.target === 'BEARER') continue;
        if (!Array.isArray(req.target)) continue;
        return { count: req.count || 1, target: req.target };
    }
    return null;
}

export function getToPlayExertTargetIds(
    G: GameState,
    card: CardState
): string[] {
    const req = getToPlayExertRequirement(card);
    if (!req || !Array.isArray(req.target)) return [];
    const count = req.count;
    return uniqueCards(
        resolveCostTarget(G, card, req.target).filter(
            (c) => getEffectiveVitality(c) > count
        )
    ).flatMap(cardTargetIds);
}

/** Sites du path où cette condition peut être posée. */
export function getSiteAttachmentHostIds(
    G: GameState,
    card: CardState,
    playerId: string
): string[] {
    if (!attachesToSite(card)) return [];
    const ids: string[] = [];
    for (const site of G.path || []) {
        if (!site) continue;
        if (!canAttachToCharacter(card, site, playerId)) continue;
        const key = (site as SiteCardState & { instanceId?: string })
            .instanceId;
        if (key) ids.push(key);
        if (site.id) ids.push(site.id);
    }
    return [...new Set(ids)];
}
