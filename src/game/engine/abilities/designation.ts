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

import {
    chooseOneOptionMeetsVitalityGate,
    findSkirmishToCancel,
} from './cancelSkirmish';
import { countFromSpotCost, abilityReplaceSiteEffect, abilityExchangeSiteEffect } from './applyAbilityEffect';
import {
    getReplaceSiteCandidates,
    getReplaceablePathSitesInCurrentRegion,
    getOwnedPathSites,
    canExchangeOwnedPathSite,
    canPlayNextSiteFromDeck,
    canTakeControlOfASite,
    canLiberateASite,
    getSitesControlledBy,
    isCardStackedOnControlledSite,
    findStackedCardSite,
    getCurrentSiteIndex,
    getStackedMinionsOnControlledSites,
} from '../../logic/sites';
import { getEffectiveTwilightCost } from '../../../utils/roamingDetection';
import {
    getWhileTwilightCostModifier,
    isWeaponAttachment,
    isWeaponStrengthSuppressed,
} from '../../logic/stats/mechanics/whileModifier';
import {
    canReplaceCurrentSite,
    canReplaceSiteInCurrentRegionForPlayer,
    isSiteReplaceForbidden,
} from '../../logic/siteReplaceRestrictions';
import {
    abilityOwnerPlayerId,
    filterCostTargetsForActor,
    playNextSiteDeckPlayerId,
} from './payAbilityCost';
import {
    canReinforce,
    findInPlayCardOwnerId,
    getActiveCardsWithCultureTokens,
    getReinforceCandidates,
    tokenCountOnCard,
} from '../../logic/cultureTokens';
import {
    areBurdenRemovalsForbidden,
    areCultureTokenChangesForbidden,
    areHealsForbidden,
    canCardTakeWound,
} from '../../logic/sites';
import { formatAbilityWhoLabel } from './collectAbilities';
import {
    getCardsStackedOnHost,
    getHandStackCandidates,
    getPlayStackCandidates,
} from '../../logic/cardStack';
import {
    getDeckOrDiscardPlayCandidates,
    getHandPlayCandidates,
} from '../../logic/playFromOutOfPlay';
import { canPlayCard } from '../canPlayCard';
import {
    attachesToSite,
    canAttachToCharacter,
} from '../canPlayCard';
import { cardMatchesTarget } from '../validations/matchers';
import { getKeywordValue } from '../keywords/keywordUtils';

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
        const ownerId = abilityOwnerPlayerId(G, source);
        if (!ownerId) return [];
        return uniqueCards(
            getCardsStackedOnHost(source, effect.target).filter((card) => {
                // Comme depuis la main : coût, unicité, toPlay…
                return canPlayCard(
                    card,
                    { G, ctx: { phase: 'shadow' }, playerID: ownerId },
                    undefined,
                    undefined,
                    { ignorePhase: true }
                ).valid;
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
        (effect.type === 'ADD_TEMP_STAT' ||
            effect.type === 'ADD_TEMP_KEYWORD') &&
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
    if (effect.type === 'WOUND' && effect.match) {
        matches = matches.filter((card) =>
            cardMatchesTarget(card, effect.match!)
        );
    }
    if (effect.type === 'WOUND') {
        // Cible invalide (ex. Uplands / archerie) → absente des candidats ;
        // abilityHasLegalEffectTarget / halo refusent l’action entière.
        return matches.filter((card) => canCardTakeWound(G, card));
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
/** Nombre de cibles de coût à désigner (N distincts, sinon 1). */
export function getCostDesignationCount(ability: Ability): number {
    const req = (ability.cost || []).find((opt) => opt.exert?.[0])?.exert?.[0];
    if (req?.distinctTargets && (req.count || 1) > 1) {
        return req.count || 1;
    }
    return 1;
}

export function getCostDesignationCandidates(
    G: GameState,
    source: CardState,
    ability: Ability,
    actingPlayerId?: string
): CardState[] {
    const option = (ability.cost || []).find((opt) => {
        const req = opt.exert?.[0];
        if (!req || req.target === 'SELF' || req.target === 'BEARER') {
            return false;
        }
        const count = req.count || 1;
        const needVitality = req.distinctTargets && count > 1 ? 1 : count;
        const needCards = req.distinctTargets && count > 1 ? count : 1;
        const sourceId = source.instanceId || source.id;
        let pool = filterCostTargetsForActor(
            G,
            source,
            resolveCostTarget(G, source, req.target),
            actingPlayerId
        );
        if (req.excludeSource) {
            pool = pool.filter(
                (card) =>
                    card.instanceId !== sourceId && card.id !== sourceId
            );
        }
        const payable = pool.filter(
            (card) => getEffectiveVitality(card) > needVitality
        );
        return payable.length >= needCards;
    });

    const req = option?.exert?.[0];
    if (req && req.target !== 'SELF' && req.target !== 'BEARER') {
        const count = req.count || 1;
        const needVitality = req.distinctTargets && count > 1 ? 1 : count;
        const sourceId = source.instanceId || source.id;
        return uniqueCards(
            filterCostTargetsForActor(
                G,
                source,
                resolveCostTarget(G, source, req.target),
                actingPlayerId
            ).filter((card) => {
                if (req.excludeSource) {
                    if (
                        (card.instanceId || card.id) === sourceId
                    ) {
                        return false;
                    }
                }
                if (getEffectiveVitality(card) <= needVitality) return false;
                if (req.excludeKeywords?.length) {
                    if (
                        req.excludeKeywords.some(
                            (kw) => getKeywordValue(card, kw, G) >= 0
                        )
                    ) {
                        return false;
                    }
                }
                return true;
            })
        );
    }

    // Spot DESIGNATION :
    // - avec exert SELF/BEARER (Saruman) ;
    // - ou seul (site Northern Pelennor : désigner le lurker, effet COST_TARGET).
    const spotWithSelfExert = (ability.cost || []).find((opt) => {
        const exertSelf = opt.exert?.some(
            (e) => e.target === 'SELF' || e.target === 'BEARER'
        );
        if (!exertSelf) return false;
        return opt.spot?.some(
            (s) => Array.isArray(s.target) && s.mode === 'DESIGNATION'
        );
    });
    const spotOnlyDesignate = (ability.cost || []).find((opt) => {
        if (opt.exert?.length) return false;
        return opt.spot?.some(
            (s) => Array.isArray(s.target) && s.mode === 'DESIGNATION'
        );
    });
    const spotOption = spotWithSelfExert || spotOnlyDesignate;
    const spotReq = spotOption?.spot?.find(
        (s) => Array.isArray(s.target) && s.mode === 'DESIGNATION'
    );
    if (spotReq && Array.isArray(spotReq.target)) {
        const sourceId = source.instanceId || source.id;
        return uniqueCards(
            filterCostTargetsForActor(
                G,
                source,
                resolveCostTarget(G, source, spotReq.target),
                actingPlayerId
            ).filter((card) => {
                if (card.isDead) return false;
                if ((card.instanceId || card.id) === sourceId) return false;
                if (card.cannotBeAssignedToSkirmish) return false;
                return true;
            })
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
    ability: Ability,
    /** Joueur qui active (Morannon : owner du site ≠ joueur qui reinforce). */
    actingPlayerId?: string
): CardState[] {
    // Effet porté par la cible du coût : pas de 2ᵉ désignation.
    const targeted = (ability.effects || []).filter(
        (item) => 'target' in item && item.target != null
    );
    if (
        targeted.length > 0 &&
        targeted.every(
            (item) =>
                'target' in item && item.target === 'COST_TARGET'
        )
    ) {
        return [];
    }

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
        const ownerId =
            actingPlayerId || abilityOwnerPlayerId(G, source);
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

    const playFromHand = (ability.effects || []).find(
        (item) => item.type === 'PLAY_FROM_HAND'
    );
    if (playFromHand && playFromHand.type === 'PLAY_FROM_HAND') {
        const ownerId =
            actingPlayerId || abilityOwnerPlayerId(G, source);
        if (!ownerId) return [];
        const playPhase =
            ownerId === (G.fpPlayerId || '0') ? 'fellowship' : 'shadow';
        const matches = getHandPlayCandidates(
            G,
            ownerId,
            playFromHand.target,
            playPhase,
            playFromHand.twilightReduce || 0,
            { ignoreDeadPileUniqueness: Boolean(playFromHand.ignoreDeadPile) }
        );
        if (matches.length < 1) return [];
        return uniqueCards(matches);
    }

    // Pioche / défausse : pas de halo plateau (overlay dédié).
    if (
        (ability.effects || []).some(
            (item) =>
                item.type === 'PLAY_FROM_DECK_OR_DISCARD' ||
                item.type === 'TAKE_FROM_DISCARD'
        )
    ) {
        return [];
    }

    const revealTop = (ability.effects || []).find(
        (item) => item.type === 'REVEAL_OPPONENT_TOP'
    );
    if (revealTop && revealTop.type === 'REVEAL_OPPONENT_TOP') {
        const place = revealTop.perFreePeoplesCard;
        if (!place || place.type !== 'PLACE_CULTURE_TOKEN') return [];
        const ownerId = abilityOwnerPlayerId(G, source);
        if (!ownerId) return [];
        const conditions = (G.players[ownerId]?.supportArea || []).filter(
            (c) =>
                c &&
                c.type === 'CONDITION' &&
                tokenCountOnCard(c, place.culture) > 0
        );
        // Désigner seulement s’il y a plusieurs situations éligibles.
        return conditions.length > 1 ? conditions : [];
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
        return opponents.filter((c) => canCardTakeWound(G, c));
    }

    // DISCARD_ALL / EXERT all / HEAL all : pas de désignation — on applique tout d’un coup.
    // HEAL onePerCulture : désignation (1 compagnon blessé par culture).
    // DISCARD chooser FREE_PEOPLE : pending dédié (pas de halo Ombre).
    const effect = (ability.effects || []).find(
        (item) =>
            item.type !== 'DISCARD_ALL' &&
            item.type !== 'PLAY_FROM_DECK_OR_DISCARD' &&
            item.type !== 'PLAY_FROM_HAND' &&
            item.type !== 'TAKE_FROM_DISCARD' &&
            item.type !== 'REVEAL_OPPONENT_TOP' &&
            !(item.type === 'EXERT' && item.all) &&
            !(item.type === 'HEAL' && item.all && !item.onePerCulture) &&
            !(item.type === 'DISCARD' && item.chooser === 'FREE_PEOPLE') &&
            'target' in item &&
            (Array.isArray(item.target) || item.target === 'SKIRMISHING')
    );
    if (!effect) return [];
    return candidatesForEffect(G, source, ability, effect);
}

/** Cibles pour `pendingFpDiscard` (Dol Guldur…). */
export function getFpDiscardCandidates(
    G: GameState,
    source: CardState,
    ability: Ability
): CardState[] {
    const effect = (ability.effects || []).find(
        (item) => item.type === 'DISCARD' && item.chooser === 'FREE_PEOPLE'
    );
    if (!effect || effect.type !== 'DISCARD') return [];
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
    ability: Ability,
    actingPlayerId?: string
): boolean {
    const need = getCostDesignationCount(ability);
    return (
        getCostDesignationCandidates(G, source, ability, actingPlayerId)
            .length >= need
    );
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
            // FORCE_ASSIGN : affectation logistique → halo + clic, pas flèche.
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

/** Nombre de cibles d’effet à désigner (1, ou min(X, blessés) si multi). */
export function getEffectDesignationCount(
    G: GameState,
    source: CardState,
    ability: Ability
): number {
    const onePerCulture = (ability.effects || []).find(
        (item) => item.type === 'HEAL' && item.onePerCulture
    );
    if (onePerCulture && onePerCulture.type === 'HEAL') {
        const available = candidatesForEffect(
            G,
            source,
            ability,
            onePerCulture
        );
        const cultures = new Set(
            available
                .map((card) => card.culture)
                .filter((c): c is NonNullable<typeof c> => Boolean(c))
        );
        return cultures.size;
    }
    const heal = (ability.effects || []).find(
        (item) =>
            item.type === 'HEAL' &&
            (item.multiFromSpot ||
                (typeof item.multiCount === 'number' && item.multiCount > 1))
    );
    if (heal && heal.type === 'HEAL') {
        const cap = heal.multiFromSpot
            ? countFromSpotCost(G, source, ability)
            : heal.multiCount || 1;
        const available = candidatesForEffect(G, source, ability, heal).length;
        return Math.min(Math.max(0, cap), available);
    }
    return 1;
}

export function abilityHasLegalEffectTarget(
    G: GameState,
    source: CardState,
    ability: Ability,
    actingPlayerId?: string
): boolean {
    for (const effect of ability.effects || []) {
        if (effect.type === 'MAKE_RING_BEARER') {
            if (isRingBearerCard(source)) return false;
            continue;
        }
        if (effect.type === 'DISCARD_ALL') {
            if (effect.skirmishingWith) {
                const involving = resolveCostTarget(
                    G,
                    source,
                    effect.skirmishingWith
                ).filter((card) => {
                    const id = card.instanceId || card.id;
                    if (!id) return false;
                    return (G.skirmishes || []).some((sk) => {
                        if (sk.resolved) return false;
                        if (sk.companionId === id) return true;
                        const mids =
                            sk.minionIds ||
                            (sk.minionId ? [sk.minionId] : []);
                        return mids.includes(id);
                    });
                });
                if (involving.length === 0) return false;
            }
            continue;
        }
        if (effect.type === 'CHOOSE_ONE') {
            const anyLegal = effect.options.some((option) => {
                if (!chooseOneOptionMeetsVitalityGate(G, source, option)) {
                    return false;
                }
                for (const optEffect of option.effects) {
                    if (optEffect.type === 'CANCEL_SKIRMISH') {
                        if (
                            !findSkirmishToCancel(
                                G,
                                source,
                                optEffect.involving
                            )
                        ) {
                            return false;
                        }
                    }
                    if (optEffect.type === 'HEAL') {
                        if (areHealsForbidden(G)) return false;
                        const targets = resolveCostTarget(
                            G,
                            source,
                            optEffect.target
                        ).filter(isHealableCard);
                        if (targets.length === 0) return false;
                    }
                }
                return true;
            });
            if (!anyLegal) return false;
            continue;
        }
        if (effect.type === 'PUT_HAND_UNDER_DECK') {
            continue;
        }
        if (effect.type === 'REVEAL_HAND') {
            continue;
        }
        if (effect.type === 'DISCARD_FROM_HAND') {
            if (effect.atRandom) {
                const whose = effect.whose || 'OWNER';
                const fpId = G.fpPlayerId || '0';
                const shadowId = fpId === '0' ? '1' : '0';
                const ownerId =
                    whose === 'FREE_PEOPLES'
                        ? fpId
                        : whose === 'SHADOW'
                          ? shadowId
                          : abilityOwnerPlayerId(G, source);
                if (!ownerId) return false;
                const hand = G.players[ownerId]?.hand || [];
                if (hand.length < (effect.count || 1)) return false;
            }
            continue;
        }
        if (
            'target' in effect &&
            effect.target === 'COST_TARGET'
        ) {
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
            const ownerId = playNextSiteDeckPlayerId(
                G,
                source,
                actingPlayerId
            );
            if (!ownerId) return false;
            if (!canPlayNextSiteFromDeck(G, ownerId)) {
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
        if (effect.type === 'PLAY_FROM_HAND') {
            const ownerId =
                actingPlayerId || abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const playPhase =
                ownerId === (G.fpPlayerId || '0') ? 'fellowship' : 'shadow';
            if (
                getHandPlayCandidates(
                    G,
                    ownerId,
                    effect.target,
                    playPhase,
                    effect.twilightReduce || 0,
                    {
                        ignoreDeadPileUniqueness: Boolean(
                            effect.ignoreDeadPile
                        ),
                    }
                ).length < 1
            ) {
                return false;
            }
            continue;
        }
        if (effect.type === 'PLAY_FROM_DECK_OR_DISCARD') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const attachHost =
                effect.attachTo === 'SELF' ? source : null;
            const playPhase =
                ownerId === (G.fpPlayerId || '0') ? 'fellowship' : 'shadow';
            if (
                getDeckOrDiscardPlayCandidates(
                    G,
                    ownerId,
                    effect.target,
                    playPhase,
                    attachHost,
                    effect.from || 'DECK_OR_DISCARD'
                ).length < 1
            ) {
                return false;
            }
            continue;
        }
        if (effect.type === 'TAKE_FROM_DISCARD') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const discard = G.players[ownerId]?.discard || [];
            const hits = discard.filter(
                (card) => card && cardMatchesTarget(card, effect.target)
            );
            if (hits.length < 1) return false;
            continue;
        }
        if (effect.type === 'REVEAL_OPPONENT_TOP') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const opponentId =
                ownerId === (G.fpPlayerId || '0')
                    ? Object.keys(G.players).find((id) => id !== ownerId)
                    : G.fpPlayerId || '0';
            if (!opponentId) return false;
            const deckLen = G.players[opponentId]?.deck?.length || 0;
            if (deckLen < 1) return false;
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
        if (effect.type === 'REMOVE_BURDENS' && areBurdenRemovalsForbidden(G)) {
            return false;
        }
        if (effect.type === 'HEAL' && areHealsForbidden(G)) {
            return false;
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
            if (areCultureTokenChangesForbidden(G)) return false;
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
        if (
            effect.type === 'HEAL' &&
            (effect.onePerCulture ||
                effect.multiFromSpot ||
                (typeof effect.multiCount === 'number' && effect.multiCount > 1))
        ) {
            if (candidatesForEffect(G, source, ability, effect).length < 1) {
                return false;
            }
            continue;
        }
        if (effect.type === 'HEAL' && effect.all) {
            continue;
        }
        if (!('target' in effect)) continue;
        if (effect.target === 'SELF' || effect.target === 'BEARER') {
            if (effect.type === 'WOUND') {
                const card = resolveAbilityTarget(G, source, effect.target);
                if (!card || !canCardTakeWound(G, card)) return false;
            }
            if (effect.type === 'HEAL') {
                const card = resolveAbilityTarget(G, source, effect.target);
                if (!card || !isHealableCard(card)) return false;
            }
            if (effect.type === 'REMOVE_CULTURE_TOKEN') {
                if (areCultureTokenChangesForbidden(G)) return false;
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
                if (areCultureTokenChangesForbidden(G)) return false;
                const card = resolveAbilityTarget(G, source, effect.target);
                if (!card) return false;
            }
            if (effect.type === 'ADD_TEMP_STAT' && effect.limit != null) {
                const used = (G.tempModifiers || [])
                    .filter((mod) => mod.id.startsWith(`${ability.id}:`))
                    .reduce((sum, mod) => sum + mod.value, 0);
                if (used + effect.value > effect.limit) return false;
            }
            // Troop of Uruk-hai : une arme ne peut pas donner de +force.
            if (
                effect.type === 'ADD_TEMP_STAT' &&
                effect.stat === 'STRENGTH' &&
                isWeaponAttachment(source)
            ) {
                const beneficiary = resolveAbilityTarget(
                    G,
                    source,
                    effect.target
                );
                if (
                    beneficiary &&
                    isWeaponStrengthSuppressed(G, beneficiary)
                ) {
                    return false;
                }
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

    const costNeed = getCostDesignationCount(ability);
    if (
        (which === 'cost' || (which === 'auto' && hasCostDesignation)) &&
        costNeed > 1 &&
        Array.isArray(costTarget)
    ) {
        return `Choisissez ${costNeed} personnages à affaiblir.`;
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
    if (
        useEffect &&
        (ability.effects || []).some((item) => item.type === 'PLAY_FROM_HAND')
    ) {
        return 'Choisissez la carte à jouer dans votre main.';
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
    // DNF « your Gollum or your Sméagol »
    if (
        target.length > 1 &&
        target.every((branch) => Array.isArray(branch))
    ) {
        const parts = target.map((branch) =>
            formatAbilityWhoLabel(branch.flat(), true)
        );
        return `Choisissez ${parts.join(' ou ')}.`;
    }
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
        (item) =>
            item.type === 'HEAL' &&
            (item.multiFromSpot ||
                item.onePerCulture ||
                (typeof item.multiCount === 'number' && item.multiCount > 1))
    );
    if (healMulti && useEffect) {
        const onePer = (ability.effects || []).some(
            (item) => item.type === 'HEAL' && item.onePerCulture
        );
        return onePer
            ? 'Choisissez un compagnon blessé de chaque culture.'
            : 'Choisissez les compagnons à soigner.';
    }
    return `Choisissez ${formatAbilityWhoLabel(tokens, true)}.`;
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
