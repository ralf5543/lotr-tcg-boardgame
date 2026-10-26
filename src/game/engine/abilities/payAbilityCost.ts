import type { Ability, AbilityCost, CardKeyword, CardState, GameState } from '../../types';
import { applyExert } from '../../../utils/applyExert';
import { discardCardFromPlay } from '../../../utils/discardCardFromPlay';
import { getEffectiveVitality } from '../../../utils/cardStats';
import { findTargetCard } from '../../../utils/cardUtils';
import { getKeywordValue } from '../keywords/keywordUtils';
import {
    resolveCostTarget,
    resolveSkirmishingOpponents,
} from './resolveCostTarget';
import {
    abilityOwnerCanSpotCultureTokens,
    countCultureTokensForPlayer,
    countSpottedCultureTokens,
    removeCultureTokensForPlayer,
    tokenCountOnCard,
} from '../../logic/cultureTokens';
import {
    areBurdenRemovalsForbidden,
    areCultureTokenChangesForbidden,
    placeCardIntoDiscardPile,
} from '../../logic/sites';
import {
    announceInitiativeIfChanged,
    freePeoplesHasInitiative,
} from '../../logic/initiative';
import { addThreats, canAddThreats } from '../../logic/threats';

const matchCard = (card: CardState | undefined | null, targetId: string) =>
    Boolean(card && (card.instanceId === targetId || card.id === targetId));

function cardHasKeyword(card: CardState, keyword: CardKeyword): boolean {
    return getKeywordValue(card, keyword) >= 0;
}

export function resolveDiscardFromHandCount(
    ability: Ability,
    effectTarget?: CardState | null
): number {
    const option = ability.cost?.[0];
    if (!option || typeof option.discardFromHand !== 'number') return 0;
    const rule = option.discardFromHandIfEffectHasKeyword;
    if (rule && effectTarget && cardHasKeyword(effectTarget, rule.keyword)) {
        return rule.count;
    }
    return option.discardFromHand;
}

export function abilityOwnerPlayerId(
    G: GameState,
    source: CardState
): string | undefined {
    const fpId = G.fpPlayerId || '0';
    if (source.kind === 'FREE_PEOPLE') return fpId;
    if (source.kind === 'SHADOW') return fpId === '0' ? '1' : '0';
    // Site : replace / contrôle = souvent FP ; « play next site » utilise
    // `playNextSiteDeckPlayerId` (joueur qui active, deck d’aventure).
    if (source.kind === 'SITE' || source.type === 'SITE') return fpId;
    return undefined;
}

/**
 * Deck d’aventure pour « play the fellowship's next site » :
 * le joueur qui active (Ombre sur Mere, FP sur One Good Turn…).
 */
export function playNextSiteDeckPlayerId(
    G: GameState,
    source: CardState,
    actingPlayerId?: string
): string | undefined {
    if (actingPlayerId != null && actingPlayerId !== '') {
        return String(actingPlayerId);
    }
    // Capacité d’ombre sur site (Mere…) → Ombre ; sinon propriétaire de la carte.
    if (source.kind === 'SITE' || source.type === 'SITE') {
        const fpId = G.fpPlayerId || '0';
        return fpId === '0' ? '1' : '0';
    }
    return abilityOwnerPlayerId(G, source);
}

export function abilityDiscardFromHandCount(
    ability: Ability,
    effectTarget?: CardState | null
): number {
    if (effectTarget !== undefined) {
        return resolveDiscardFromHandCount(ability, effectTarget);
    }
    return ability.cost?.[0]?.discardFromHand || 0;
}

export function abilityNeedsHandDiscard(ability: Ability): boolean {
    return abilityDiscardFromHandCount(ability) > 0;
}

/** Filtre optionnel : défausser seulement des cartes FP / Ombre. */
export function abilityDiscardFromHandKind(
    ability: Ability
): 'FREE_PEOPLE' | 'SHADOW' | undefined {
    return ability.cost?.[0]?.discardFromHandKind;
}

export function abilityDiscardFromHandEffect(
    ability: Ability
): { count: number; upTo?: boolean } | undefined {
    const effect = ability.effects?.find(
        (item) => item.type === 'DISCARD_FROM_HAND'
    );
    if (!effect || effect.type !== 'DISCARD_FROM_HAND') return undefined;
    // Au hasard : pas de choix joueur.
    if (effect.atRandom) return undefined;
    return { count: effect.count, upTo: effect.upTo };
}

/**
 * Site : « your X » = cartes du joueur qui active (pas le propriétaire du site).
 */
export function filterCostTargetsForActor(
    G: GameState,
    source: CardState,
    cards: CardState[],
    actingPlayerId?: string
): CardState[] {
    if (!(source.kind === 'SITE' || source.type === 'SITE')) return cards;
    if (actingPlayerId == null || actingPlayerId === '') return cards;
    const fpId = String(G.fpPlayerId || '0');
    const wantKind =
        String(actingPlayerId) === fpId ? 'FREE_PEOPLE' : 'SHADOW';
    return cards.filter((c) => c.kind === wantKind);
}

/**
 * Main d’où l’on défausse : sur un site, « from hand » = celle du joueur qui
 * active (Ombre sur Courtyard Parapet) ; sinon propriétaire de la carte.
 */
function discardFromHandPlayerId(
    G: GameState,
    source: CardState,
    actingPlayerId?: string
): string | undefined {
    const isSite = source.kind === 'SITE' || source.type === 'SITE';
    if (isSite && actingPlayerId != null && actingPlayerId !== '') {
        return String(actingPlayerId);
    }
    return abilityOwnerPlayerId(G, source);
}

function canPayOption(
    G: GameState,
    source: CardState,
    option: AbilityCost[number],
    actingPlayerId?: string
): boolean {
    if (option.exert && Array.isArray(option.exert)) {
        for (const req of option.exert) {
            const count = req.count || 1;
            let cards = filterCostTargetsForActor(
                G,
                source,
                resolveCostTarget(G, source, req.target),
                actingPlayerId
            );
            if (req.excludeKeywords?.length) {
                cards = cards.filter(
                    (c) =>
                        !req.excludeKeywords!.some(
                            (kw) => getKeywordValue(c, kw, G) >= 0
                        )
                );
            }
            if (cards.length === 0) return false;
            if (req.distinctTargets && count > 1) {
                const payable = cards.filter(
                    (c) => getEffectiveVitality(c) > 1
                );
                if (payable.length < count) return false;
            } else {
                const payable = cards.filter(
                    (c) => getEffectiveVitality(c) > count
                );
                if (payable.length < 1) return false;
            }
        }
    }

    if (option.spot && Array.isArray(option.spot)) {
        for (const req of option.spot) {
            const count = req.count || 1;
            let cards = resolveCostTarget(G, source, req.target);
            if (req.excludeSource) {
                const sourceId = source.instanceId || source.id;
                cards = cards.filter(
                    (card) =>
                        card.instanceId !== sourceId && card.id !== sourceId
                );
            }
            if (cards.length < count) return false;
        }
    }

    if (option.removeTwilight && option.removeTwilight > 0) {
        if ((G.twilightPool || 0) < option.removeTwilight) return false;
    }

    if (option.spotTwilight && option.spotTwilight > 0) {
        if ((G.twilightPool || 0) < option.spotTwilight) return false;
    }

    if (typeof option.spotBurdens === 'number' && option.spotBurdens > 0) {
        const fpId = G.fpPlayerId || '0';
        const burdens = G.players[fpId]?.burdens || 0;
        if (burdens < option.spotBurdens) return false;
    }

    if (typeof option.spotThreats === 'number' && option.spotThreats > 0) {
        const fpId = G.fpPlayerId || '0';
        const threats = G.players[fpId]?.threats || 0;
        if (threats < option.spotThreats) return false;
    }

    if (
        typeof option.cannotSpotThreats === 'number' &&
        option.cannotSpotThreats > 0
    ) {
        const fpId = G.fpPlayerId || '0';
        const threats = G.players[fpId]?.threats || 0;
        if (threats >= option.cannotSpotThreats) return false;
    }

    if (option.removeThreats && option.removeThreats > 0) {
        const fpId = G.fpPlayerId || '0';
        const fpPlayer = G.players[fpId];
        if (!fpPlayer || (fpPlayer.threats || 0) < option.removeThreats) {
            return false;
        }
    }

    if (option.removeBurdens && option.removeBurdens > 0) {
        if (areBurdenRemovalsForbidden(G)) return false;
        const fpId = G.fpPlayerId || '0';
        const fpPlayer = G.players[fpId];
        if (!fpPlayer || (fpPlayer.burdens || 0) < option.removeBurdens) {
            return false;
        }
    }

    if (option.addThreats && option.addThreats > 0) {
        if (!canAddThreats(G)) return false;
    }
    if (option.addThreatsEqualTo === 'SKIRMISHING_MINIONS_VITALITY') {
        const vitality = resolveSkirmishingOpponents(G, source)
            .filter((c) => c.type === 'MINION' && !c.isDead)
            .reduce((sum, c) => sum + getEffectiveVitality(c), 0);
        if (vitality <= 0) return false;
    }

    if (option.spotCultureTokens) {
        if (
            !abilityOwnerCanSpotCultureTokens(
                G,
                source,
                option.spotCultureTokens.culture,
                option.spotCultureTokens.count
            )
        ) {
            return false;
        }
    }

    if (typeof option.spotHand === 'number' && option.spotHand > 0) {
        const ownerId = abilityOwnerPlayerId(G, source);
        if (!ownerId) return false;
        const hand = G.players[ownerId]?.hand || [];
        if (hand.length < option.spotHand) return false;
    }

    if (option.discardEntireHand) {
        const ownerId = abilityOwnerPlayerId(G, source);
        if (!ownerId) return false;
        const hand = G.players[ownerId]?.hand || [];
        // « discard your hand » exige au moins une carte (sinon inertie).
        if (hand.length === 0) return false;
    }

    if (option.removeCultureTokens) {
        if (areCultureTokenChangesForbidden(G)) return false;
        const ownerId = abilityOwnerPlayerId(G, source);
        if (!ownerId) return false;
        const { culture, count, from } = option.removeCultureTokens;
        if (from === 'SELF') {
            if (tokenCountOnCard(source, culture) < count) return false;
        } else if (countSpottedCultureTokens(G, culture) < count) {
            return false;
        }
    }

    if (option.discardFromPlay && Array.isArray(option.discardFromPlay)) {
        for (const req of option.discardFromPlay) {
            const count = req.count || 1;
            let cards = resolveCostTarget(G, source, req.target).filter(
                (card) => !card.isDead
            );
            if (req.excludeSource) {
                const sourceId = source.instanceId || source.id;
                cards = cards.filter(
                    (card) =>
                        card.instanceId !== sourceId && card.id !== sourceId
                );
            }
            if (req.target === 'SELF' || req.target === 'BEARER') {
                const target = cards[0];
                if (!target) return false;
                const inPlay = findTargetCard(
                    G,
                    target.instanceId || target.id
                );
                if (!inPlay) return false;
            } else if (Array.isArray(req.target)) {
                if (cards.length < count) return false;
            } else {
                return false;
            }
        }
    }

    if (typeof option.discardFromHand === 'number' && option.discardFromHand > 0) {
        const ownerId = discardFromHandPlayerId(G, source, actingPlayerId);
        if (!ownerId) return false;
        const hand = G.players[ownerId]?.hand || [];
        const kind = option.discardFromHandKind;
        const eligible = kind
            ? hand.filter((card) => card && card.kind === kind)
            : hand;
        const rule = option.discardFromHandIfEffectHasKeyword;
        // Sans cible : assez pour le minimum possible (réduction si mot-clé).
        const need = rule
            ? Math.min(option.discardFromHand, rule.count)
            : option.discardFromHand;
        if (eligible.length < need) return false;
    }

    // addBurdens : toujours payable (on ajoute).
    // addThreats : vérifié via canAddThreats plus haut.

    return true;
}

export function canPayAbilityCost(
    G: GameState,
    source: CardState,
    cost: AbilityCost,
    actingPlayerId?: string
): boolean {
    if (!cost || cost.length === 0) return true;
    return cost.some((option) =>
        canPayOption(G, source, option, actingPlayerId)
    );
}

function pickExertTarget(
    cards: CardState[],
    count: number,
    chosenTargetId?: string,
    requireChoice = false
): CardState | undefined {
    const payable = cards.filter((c) => getEffectiveVitality(c) > count);
    if (chosenTargetId) {
        return payable.find(
            (c) => c.instanceId === chosenTargetId || c.id === chosenTargetId
        );
    }
    if (requireChoice) return undefined;
    if (payable.length === 1) return payable[0];
    return undefined;
}

function normalizeChosenIds(chosen?: string | string[]): string[] {
    if (!chosen) return [];
    return Array.isArray(chosen) ? chosen.filter(Boolean) : [chosen];
}

export function discardCardsFromHand(
    G: GameState,
    ownerId: string,
    cardIds: string[]
): boolean {
    const player = G.players[ownerId];
    if (!player?.hand) return false;
    const unique = [...new Set(cardIds)];
    if (unique.length !== cardIds.length || unique.length === 0) return false;

    const fpId = G.fpPlayerId || '0';
    const watchInitiative = String(ownerId) === String(fpId);
    const hadInitiative = watchInitiative
        ? freePeoplesHasInitiative(G)
        : false;

    const picked: CardState[] = [];
    for (const id of unique) {
        const card = player.hand.find((item) => matchCard(item, id));
        if (!card) return false;
        picked.push(card);
    }

    for (const card of picked) {
        const index = player.hand.findIndex((item) =>
            matchCard(item, card.instanceId || card.id)
        );
        if (index < 0) return false;
        const [removed] = player.hand.splice(index, 1);
        if (!removed) return false;
        placeCardIntoDiscardPile(G, ownerId, removed);
    }
    if (watchInitiative) {
        announceInitiativeIfChanged(G, hadInitiative);
    }
    return true;
}

function payOption(
    G: GameState,
    source: CardState,
    option: AbilityCost[number],
    chosenTargetId?: string | string[],
    discardedHandIds?: string[],
    effectTargetId?: string,
    actingPlayerId?: string
): boolean {
    if (option.exert && Array.isArray(option.exert)) {
        for (const req of option.exert) {
            const count = req.count || 1;
            let cards = filterCostTargetsForActor(
                G,
                source,
                resolveCostTarget(G, source, req.target),
                actingPlayerId
            );
            if (req.excludeKeywords?.length) {
                cards = cards.filter(
                    (c) =>
                        !req.excludeKeywords!.some(
                            (kw) => getKeywordValue(c, kw, G) >= 0
                        )
                );
            }
            // « Exert 2 hunters » : N cartes distinctes, 1 affaiblissement chacune.
            if (req.distinctTargets && count > 1) {
                const ids = normalizeChosenIds(chosenTargetId);
                if (ids.length !== count) return false;
                if (new Set(ids).size !== count) return false;
                for (const id of ids) {
                    const card = cards.find((c) => matchCard(c, id));
                    if (!card || getEffectiveVitality(card) <= 1) return false;
                    if (!applyExert(G, card)) return false;
                }
                continue;
            }
            const singleId = normalizeChosenIds(chosenTargetId)[0];
            const isNamed = Array.isArray(req.target);
            const target = isNamed
                ? pickExertTarget(
                      cards,
                      count,
                      singleId,
                      req.mode === 'DESIGNATION'
                  )
                : pickExertTarget(cards, count);
            if (!target) return false;
            // Affaiblir N fois : vitalité > N (chaque affaiblissement refuse si ≤ 1).
            if (getEffectiveVitality(target) <= count) return false;
            for (let i = 0; i < count; i += 1) {
                if (!applyExert(G, target)) return false;
            }
        }
    }
    // Défausse main avant crépuscule : valider (kind / nombre) avant tout paiement.
    if (typeof option.discardFromHand === 'number' && option.discardFromHand > 0) {
        const ownerId = discardFromHandPlayerId(G, source, actingPlayerId);
        if (!ownerId) return false;
        const effectCard = effectTargetId
            ? (findTargetCard(G, effectTargetId) as CardState | null)
            : null;
        const rule = option.discardFromHandIfEffectHasKeyword;
        const need =
            rule && effectCard && cardHasKeyword(effectCard, rule.keyword)
                ? rule.count
                : option.discardFromHand;
        if (!discardedHandIds || discardedHandIds.length !== need) {
            return false;
        }
        const kind = option.discardFromHandKind;
        if (kind) {
            const hand = G.players[ownerId]?.hand || [];
            for (const id of discardedHandIds) {
                const card = hand.find(
                    (c) => c && (c.instanceId === id || c.id === id)
                );
                if (!card || card.kind !== kind) return false;
            }
        }
        if (!discardCardsFromHand(G, ownerId, discardedHandIds)) return false;
    }
    if (option.addTwilight && option.addTwilight > 0) {
        G.twilightPool = (G.twilightPool || 0) + option.addTwilight;
    }
    if (option.removeTwilight && option.removeTwilight > 0) {
        if ((G.twilightPool || 0) < option.removeTwilight) return false;
        G.twilightPool -= option.removeTwilight;
    }
    if (option.discardFromPlay && Array.isArray(option.discardFromPlay)) {
        for (const req of option.discardFromPlay) {
            let cards = resolveCostTarget(G, source, req.target);
            if (req.excludeSource) {
                const sourceId = source.instanceId || source.id;
                cards = cards.filter(
                    (card) =>
                        card.instanceId !== sourceId && card.id !== sourceId
                );
            }
            if (req.target === 'SELF' || req.target === 'BEARER') {
                const target = cards[0];
                if (!target || !discardCardFromPlay(G, target)) return false;
            } else if (Array.isArray(req.target)) {
                const target = chosenTargetId
                    ? cards.find((card) => matchCard(card, chosenTargetId))
                    : undefined;
                if (!target || target.isDead) return false;
                if (!discardCardFromPlay(G, target)) return false;
            } else {
                return false;
            }
        }
    }
    if (option.discardEntireHand) {
        const ownerId = abilityOwnerPlayerId(G, source);
        if (!ownerId) return false;
        const hand = G.players[ownerId]?.hand || [];
        if (hand.length === 0) return false;
        const allIds = hand.map((card) => card.instanceId || card.id);
        if (!discardCardsFromHand(G, ownerId, allIds)) return false;
    }
    if (option.addBurdens && option.addBurdens > 0) {
        const fpId = G.fpPlayerId || '0';
        const fpPlayer = G.players[fpId];
        if (!fpPlayer) return false;
        fpPlayer.burdens = (fpPlayer.burdens || 0) + option.addBurdens;
    }
    if (option.addThreats && option.addThreats > 0) {
        if (addThreats(G, option.addThreats) < option.addThreats) {
            return false;
        }
    }
    if (option.addThreatsEqualTo === 'SKIRMISHING_MINIONS_VITALITY') {
        const vitality = resolveSkirmishingOpponents(G, source)
            .filter((c) => c.type === 'MINION' && !c.isDead)
            .reduce((sum, c) => sum + getEffectiveVitality(c), 0);
        if (vitality <= 0) return false;
        // Plafond menaces : on ajoute ce qu’on peut (surplus ignoré).
        addThreats(G, vitality);
    }
    if (option.removeThreats && option.removeThreats > 0) {
        const fpId = G.fpPlayerId || '0';
        const fpPlayer = G.players[fpId];
        if (!fpPlayer || (fpPlayer.threats || 0) < option.removeThreats) {
            return false;
        }
        fpPlayer.threats -= option.removeThreats;
    }
    if (option.removeBurdens && option.removeBurdens > 0) {
        if (areBurdenRemovalsForbidden(G)) return false;
        const fpId = G.fpPlayerId || '0';
        const fpPlayer = G.players[fpId];
        if (!fpPlayer || (fpPlayer.burdens || 0) < option.removeBurdens) {
            return false;
        }
        fpPlayer.burdens -= option.removeBurdens;
    }
    if (option.removeCultureTokens) {
        const ownerId = abilityOwnerPlayerId(G, source);
        if (!ownerId) return false;
        const { culture, count, from } = option.removeCultureTokens;
        const removed = removeCultureTokensForPlayer(
            G,
            ownerId,
            culture,
            count,
            from === 'SELF'
                ? { fromSelf: source }
                : chosenTargetId
                  ? { targetId: chosenTargetId }
                  : undefined
        );
        if (removed < count) return false;
    }
    return true;
}

export function payAbilityCost(
    G: GameState,
    source: CardState,
    cost: AbilityCost,
    chosenTargetId?: string | string[],
    discardedHandIds?: string[],
    effectTargetId?: string | string[],
    actingPlayerId?: string
): boolean {
    if (!cost || cost.length === 0) return true;
    const option = cost.find((opt) =>
        canPayOption(G, source, opt, actingPlayerId)
    );
    if (!option) return false;
    const effectId = Array.isArray(effectTargetId)
        ? effectTargetId[0]
        : effectTargetId ||
          (Array.isArray(chosenTargetId)
              ? chosenTargetId[0]
              : chosenTargetId);
    return payOption(
        G,
        source,
        option,
        chosenTargetId,
        discardedHandIds,
        effectId,
        actingPlayerId
    );
}

export function canPayAbility(
    G: GameState,
    source: CardState,
    ability: Ability,
    actingPlayerId?: string
): boolean {
    return canPayAbilityCost(G, source, ability.cost, actingPlayerId);
}
