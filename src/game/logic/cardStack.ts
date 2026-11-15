import type { CardState, GameState } from '../types';
import { cardMatchesTarget } from '../engine/validations/matchers';
import { canPlayCard } from '../engine/canPlayCard';
import { findInPlayCardOwnerId } from './cultureTokens';
import { getEffectiveTwilightCost } from '../../utils/roamingDetection';
import { getWhileTwilightCostModifier } from './stats/mechanics/whileModifier';
import {
    detachCardFromBattlefield,
    getCurrentSiteIndex,
    placeCardIntoDiscardPile,
} from './sites';

const matchCard = (card: CardState | undefined | null, targetId: string) =>
    Boolean(card && (card.instanceId === targetId || card.id === targetId));

/** Retire une carte de la main du propriétaire. */
export function removeCardFromHand(
    G: GameState,
    ownerId: string,
    cardId: string
): CardState | null {
    const player = G.players[ownerId];
    if (!player?.hand) return null;
    const index = player.hand.findIndex((card) => matchCard(card, cardId));
    if (index < 0) return null;
    const [removed] = player.hand.splice(index, 1);
    return removed || null;
}

/**
 * Empile une carte sur l’hôte (aire de soutien).
 * `from: 'HAND'` : retire de la main ; `PLAY` : séide du champ ou possession en jeu.
 */
export function stackCardOnHost(
    G: GameState,
    host: CardState,
    card: CardState,
    from: 'HAND' | 'PLAY',
    ownerId: string,
    maxStacked?: number
): boolean {
    if (!host || !card) return false;
    if (
        typeof maxStacked === 'number' &&
        (host.stacked?.length || 0) >= maxStacked
    ) {
        return false;
    }

    let removed: CardState | null = null;
    if (from === 'HAND') {
        removed = removeCardFromHand(G, ownerId, card.instanceId || card.id);
    } else if (card.type === 'MINION') {
        removed = detachCardFromBattlefield(G, card);
    } else if (card.type === 'POSSESSION') {
        removed = detachPossessionFromHost(G, card);
    } else {
        return false;
    }
    if (!removed) return false;

    // Règle : empiler = perdre attachements, jetons (blessures, culture…).
    if (removed.attachments?.length) {
        const owner =
            findInPlayCardOwnerId(G, host) || ownerId;
        for (const att of removed.attachments) {
            if (att) placeCardIntoDiscardPile(G, owner, att);
        }
        removed.attachments = [];
    }
    removed.wounds = 0;
    removed.cultureTokens = undefined;
    removed.tempKeywords = undefined;

    if (!host.stacked) host.stacked = [];
    host.stacked.push(removed);
    return true;
}

/** Prend une carte empilée sur l’hôte et la remet en main. */
export function takeStackedCardToHand(
    G: GameState,
    host: CardState,
    cardId: string,
    ownerId: string
): boolean {
    if (!host.stacked?.length) return false;
    const player = G.players[ownerId];
    if (!player) return false;

    const index = host.stacked.findIndex((card) => matchCard(card, cardId));
    if (index < 0) return false;
    const [taken] = host.stacked.splice(index, 1);
    if (!taken) return false;

    if (!player.hand) player.hand = [];
    player.hand.push(taken);
    return true;
}

/**
 * Joue un séide empilé sur une carte (Web…) « comme depuis la main » :
 * paie le crépuscule effectif, place sur le champ.
 */
export function playStackedMinionFromCard(
    G: GameState,
    host: CardState,
    card: CardState,
    ownerId: string
): number | null {
    if (!host.stacked?.length) return null;
    if (card.type !== 'MINION' || card.kind !== 'SHADOW') return null;

    const hostOwner = findInPlayCardOwnerId(G, host);
    if (hostOwner !== ownerId) return null;

    const id = card.instanceId || card.id;
    const index = host.stacked.findIndex((c) => matchCard(c, id));
    if (index < 0) return null;

    const playCheck = canPlayCard(
        card,
        { G, ctx: { phase: 'shadow' }, playerID: ownerId },
        undefined,
        undefined,
        { ignorePhase: true }
    );
    if (!playCheck.valid) return null;

    const cost = getEffectiveTwilightCost(
        card,
        getCurrentSiteIndex(G),
        getWhileTwilightCostModifier(G, card)
    );
    if ((G.twilightPool || 0) < cost) return null;

    const [played] = host.stacked.splice(index, 1);
    if (!played) return null;

    G.twilightPool = (G.twilightPool || 0) - cost;
    if (!G.battlefield) G.battlefield = [];
    G.battlefield.push(played);
    return cost;
}

export function getCardsStackedOnHost(
    host: CardState,
    filter?: string[][]
): CardState[] {
    const list = host.stacked || [];
    if (!filter) return [...list];
    return list.filter(
        (card) => card && !card.isDead && cardMatchesTarget(card, filter)
    );
}

/** Cartes en main éligibles à empiler sur l’hôte. */
export function getHandStackCandidates(
    G: GameState,
    ownerId: string,
    filter: string[][]
): CardState[] {
    const hand = G.players[ownerId]?.hand || [];
    return hand.filter((card) => card && cardMatchesTarget(card, filter));
}

/** Séides en jeu (champ) éligibles à empiler sur l’hôte. */
/** Détache une possession de son porteur (empilement Twisted Tales…). */
function detachPossessionFromHost(
    G: GameState,
    possession: CardState
): CardState | null {
    const possessionId = possession.instanceId || possession.id;
    if (!possessionId) return null;
    let removed: CardState | null = null;
    forEachInPlayCardForDetach(G, (host) => {
        if (removed || !host.attachments?.length) return;
        const idx = host.attachments.findIndex(
            (att) =>
                att &&
                (att.instanceId === possessionId || att.id === possessionId)
        );
        if (idx < 0) return;
        const [att] = host.attachments.splice(idx, 1);
        if (att) {
            delete att.attachedTo;
            delete att.attachedViaAid;
            removed = att;
        }
    });
    return removed;
}

function forEachInPlayCardForDetach(
    G: GameState,
    visit: (card: CardState) => void
): void {
    for (const player of Object.values(G.players || {})) {
        if (!player) continue;
        for (const card of player.fellowshipArea || []) {
            if (card) visit(card);
        }
        for (const card of player.supportArea || []) {
            if (card) visit(card);
        }
    }
    for (const card of G.battlefield || []) {
        if (card) visit(card);
    }
}

export function getPlayStackCandidates(
    G: GameState,
    filter: string[][]
): CardState[] {
    const wantsPossession = filter.some((branch) =>
        branch.some((token) => token.toUpperCase() === 'POSSESSION')
    );
    if (wantsPossession) {
        const found: CardState[] = [];
        forEachInPlayCardForDetach(G, (host) => {
            for (const att of host.attachments || []) {
                if (
                    att &&
                    att.type === 'POSSESSION' &&
                    cardMatchesTarget(att, filter)
                ) {
                    found.push(att);
                }
            }
        });
        return found;
    }
    return (G.battlefield || []).filter(
        (card) =>
            card &&
            card.type === 'MINION' &&
            !card.isDead &&
            cardMatchesTarget(card, filter)
    );
}
