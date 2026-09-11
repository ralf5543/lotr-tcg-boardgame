import type { Ability, AbilityCost, CardState, GameState } from '../../types';
import { applyExert } from '../../../utils/applyExert';
import { discardCardFromPlay } from '../../../utils/discardCardFromPlay';
import { getEffectiveVitality } from '../../../utils/cardStats';
import { findTargetCard } from '../../../utils/cardUtils';
import { resolveCostTarget } from './resolveCostTarget';

const matchCard = (card: CardState | undefined | null, targetId: string) =>
    Boolean(card && (card.instanceId === targetId || card.id === targetId));

function abilityOwnerPlayerId(
    G: GameState,
    source: CardState
): string | undefined {
    const fpId = G.fpPlayerId || '0';
    if (source.kind === 'FREE_PEOPLE') return fpId;
    if (source.kind === 'SHADOW') return fpId === '0' ? '1' : '0';
    return undefined;
}

export function abilityDiscardFromHandCount(ability: Ability): number {
    return ability.cost?.[0]?.discardFromHand || 0;
}

export function abilityNeedsHandDiscard(ability: Ability): boolean {
    return abilityDiscardFromHandCount(ability) > 0;
}

function canPayOption(
    G: GameState,
    source: CardState,
    option: AbilityCost[number]
): boolean {
    if (option.exert && Array.isArray(option.exert)) {
        for (const req of option.exert) {
            const count = req.count || 1;
            const cards = resolveCostTarget(G, source, req.target);
            if (cards.length === 0) return false;
            const payable = cards.filter(
                (c) => getEffectiveVitality(c) > count
            );
            if (payable.length < 1) return false;
        }
    }

    if (option.spot && Array.isArray(option.spot)) {
        for (const req of option.spot) {
            const count = req.count || 1;
            const cards = resolveCostTarget(G, source, req.target);
            if (cards.length < count) return false;
        }
    }

    if (option.removeTwilight && option.removeTwilight > 0) {
        if ((G.twilightPool || 0) < option.removeTwilight) return false;
    }

    if (option.spotTwilight && option.spotTwilight > 0) {
        if ((G.twilightPool || 0) < option.spotTwilight) return false;
    }

    if (option.discardFromPlay && Array.isArray(option.discardFromPlay)) {
        for (const req of option.discardFromPlay) {
            if (req.target !== 'SELF' && req.target !== 'BEARER') {
                return false;
            }
            const cards = resolveCostTarget(G, source, req.target);
            const target = cards[0];
            if (!target || target.isDead) return false;
            const inPlay = findTargetCard(
                G,
                target.instanceId || target.id
            );
            if (!inPlay) return false;
        }
    }

    if (typeof option.discardFromHand === 'number' && option.discardFromHand > 0) {
        const ownerId = abilityOwnerPlayerId(G, source);
        if (!ownerId) return false;
        const hand = G.players[ownerId]?.hand || [];
        if (hand.length < option.discardFromHand) return false;
    }

    return true;
}

export function canPayAbilityCost(
    G: GameState,
    source: CardState,
    cost: AbilityCost
): boolean {
    if (!cost || cost.length === 0) return true;
    return cost.some((option) => canPayOption(G, source, option));
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

function discardCardsFromHand(
    G: GameState,
    ownerId: string,
    cardIds: string[]
): boolean {
    const player = G.players[ownerId];
    if (!player?.hand) return false;
    const unique = [...new Set(cardIds)];
    if (unique.length !== cardIds.length || unique.length === 0) return false;

    const picked: CardState[] = [];
    for (const id of unique) {
        const card = player.hand.find((item) => matchCard(item, id));
        if (!card) return false;
        picked.push(card);
    }

    if (!player.discard) player.discard = [];
    for (const card of picked) {
        const index = player.hand.findIndex((item) =>
            matchCard(item, card.instanceId || card.id)
        );
        if (index < 0) return false;
        const [removed] = player.hand.splice(index, 1);
        if (!removed) return false;
        player.discard.push(removed);
    }
    return true;
}

function payOption(
    G: GameState,
    source: CardState,
    option: AbilityCost[number],
    chosenTargetId?: string,
    discardedHandIds?: string[]
): boolean {
    if (option.exert && Array.isArray(option.exert)) {
        for (const req of option.exert) {
            const count = req.count || 1;
            const cards = resolveCostTarget(G, source, req.target);
            const isNamed = Array.isArray(req.target);
            const target = isNamed
                ? pickExertTarget(
                      cards,
                      count,
                      chosenTargetId,
                      req.mode === 'DESIGNATION'
                  )
                : pickExertTarget(cards, count);
            if (!target) return false;
            for (let i = 0; i < count; i += 1) {
                if (!applyExert(G, target)) return false;
            }
        }
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
            if (req.target !== 'SELF' && req.target !== 'BEARER') {
                return false;
            }
            const cards = resolveCostTarget(G, source, req.target);
            const target = cards[0];
            if (!target || !discardCardFromPlay(G, target)) return false;
        }
    }
    if (typeof option.discardFromHand === 'number' && option.discardFromHand > 0) {
        const ownerId = abilityOwnerPlayerId(G, source);
        if (!ownerId) return false;
        if (
            !discardedHandIds ||
            discardedHandIds.length !== option.discardFromHand
        ) {
            return false;
        }
        if (!discardCardsFromHand(G, ownerId, discardedHandIds)) return false;
    }
    return true;
}

export function payAbilityCost(
    G: GameState,
    source: CardState,
    cost: AbilityCost,
    chosenTargetId?: string,
    discardedHandIds?: string[]
): boolean {
    if (!cost || cost.length === 0) return true;
    const option = cost.find((opt) => canPayOption(G, source, opt));
    if (!option) return false;
    return payOption(G, source, option, chosenTargetId, discardedHandIds);
}

export function canPayAbility(G: GameState, source: CardState, ability: Ability): boolean {
    return canPayAbilityCost(G, source, ability.cost);
}
