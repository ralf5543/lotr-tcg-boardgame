import type { CardState, GameState } from '../types';
import { cardMatchesTarget } from '../engine/validations/matchers';
import { canPlayCard } from '../engine/canPlayCard';
import { getEffectiveTwilightCost } from '../../utils/roamingDetection';
import { getWhileTwilightCostModifier } from './stats/mechanics/whileModifier';
import { getCurrentSiteIndex } from './sites';

const matchCard = (card: CardState | undefined | null, targetId: string) =>
    Boolean(card && (card.instanceId === targetId || card.id === targetId));

/** Mélange Fisher–Yates (pioche après recherche). */
export function shufflePlayerDeck(G: GameState, ownerId: string): void {
    const deck = G.players[ownerId]?.deck;
    if (!deck || deck.length < 2) return;
    for (let i = deck.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = deck[i];
        deck[i] = deck[j]!;
        deck[j] = tmp!;
    }
}

export type DeckOrDiscardSource = 'DECK' | 'DISCARD';

export function findInDeckOrDiscard(
    G: GameState,
    ownerId: string,
    cardId: string
): { card: CardState; source: DeckOrDiscardSource; index: number } | null {
    const player = G.players[ownerId];
    if (!player) return null;

    const deckIndex = (player.deck || []).findIndex((c) => matchCard(c, cardId));
    if (deckIndex >= 0) {
        const card = player.deck![deckIndex];
        if (card) return { card, source: 'DECK', index: deckIndex };
    }

    const discardIndex = (player.discard || []).findIndex((c) =>
        matchCard(c, cardId)
    );
    if (discardIndex >= 0) {
        const card = player.discard![discardIndex];
        if (card) return { card, source: 'DISCARD', index: discardIndex };
    }

    return null;
}

/**
 * Toutes les cartes de la pioche puis de la défausse (parcours « papier »).
 * Le filtre d’effet ne sert qu’à la sélection légale, pas à masquer.
 */
export function getDeckOrDiscardBrowsePool(
    G: GameState,
    ownerId: string
): { deck: CardState[]; discard: CardState[] } {
    const player = G.players[ownerId];
    if (!player) return { deck: [], discard: [] };
    return {
        deck: [...(player.deck || [])],
        discard: [...(player.discard || [])],
    };
}

/**
 * Candidats jouables depuis pioche ou défausse (filtre + coût + unicité + toPlay).
 */
export function getDeckOrDiscardPlayCandidates(
    G: GameState,
    ownerId: string,
    filter: string[][],
    phase = 'shadow'
): CardState[] {
    const player = G.players[ownerId];
    if (!player) return [];

    const pool = [...(player.deck || []), ...(player.discard || [])].filter(
        (card) => card && cardMatchesTarget(card, filter)
    );

    return pool.filter((card) => {
        const check = canPlayCard(
            card,
            { G, ctx: { phase }, playerID: ownerId },
            undefined,
            undefined,
            { ignorePhase: true }
        );
        return check.valid;
    });
}

/**
 * Joue une carte depuis la pioche ou la défausse (paie le crépuscule effectif).
 * `filter` : doit matcher (effet Captured…). Mélange la pioche après recherche.
 */
export function playCardFromDeckOrDiscard(
    G: GameState,
    ownerId: string,
    cardId: string,
    filter?: string[][],
    phase = 'shadow'
): CardState | null {
    const found = findInDeckOrDiscard(G, ownerId, cardId);
    if (!found) return null;

    const { card, source, index } = found;
    if (filter && !cardMatchesTarget(card, filter)) return null;

    const check = canPlayCard(
        card,
        { G, ctx: { phase }, playerID: ownerId },
        undefined,
        undefined,
        { ignorePhase: true }
    );
    if (!check.valid) return null;

    const cost = getEffectiveTwilightCost(
        card,
        getCurrentSiteIndex(G),
        getWhileTwilightCostModifier(G, card)
    );
    if ((G.twilightPool || 0) < cost) return null;

    const player = G.players[ownerId];
    if (!player) return null;

    let removed: CardState | undefined;
    if (source === 'DECK') {
        [removed] = player.deck!.splice(index, 1);
    } else {
        [removed] = player.discard!.splice(index, 1);
    }
    if (!removed) return null;

    G.twilightPool = (G.twilightPool || 0) - cost;

    if (removed.type === 'MINION') {
        if (!G.battlefield) G.battlefield = [];
        G.battlefield.push(removed);
    } else if (
        removed.type === 'CONDITION' ||
        removed.type === 'POSSESSION' ||
        removed.type === 'ARTIFACT' ||
        removed.type === 'FOLLOWER'
    ) {
        if (!player.supportArea) player.supportArea = [];
        player.supportArea.push(removed);
    } else {
        if (source === 'DECK') player.deck!.splice(index, 0, removed);
        else player.discard!.splice(index, 0, removed);
        G.twilightPool += cost;
        return null;
    }

    shufflePlayerDeck(G, ownerId);
    return removed;
}
