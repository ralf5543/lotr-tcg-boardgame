import type { CardState, GameState } from '../types';
import { cardMatchesTarget } from '../engine/validations/matchers';
import {
    canAttachToCharacter,
    canPlayCard,
    requiresAttachmentTarget,
} from '../engine/canPlayCard';
import { getEffectiveTwilightCost } from '../../utils/roamingDetection';
import { getWhileTwilightCostModifier } from './stats/mechanics/whileModifier';
import { getCurrentSiteIndex, placeCardIntoDiscardPile } from './sites';
import { applyAutomaticToPlayCosts } from './applyToPlayCosts';

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

/** Hôtes légaux pour une possession / artefact / situation à attacher. */
export function findLegalAttachmentHosts(
    G: GameState,
    ownerId: string,
    attachment: CardState,
    phase = 'fellowship'
): CardState[] {
    const fpId = G.fpPlayerId || '0';
    const isFP = ownerId === fpId;
    const hosts: CardState[] = [];

    if (isFP) {
        for (const card of G.players[ownerId]?.fellowshipArea || []) {
            if (card) hosts.push(card);
        }
        for (const card of G.players[ownerId]?.supportArea || []) {
            if (card && (card.type === 'ALLY' || card.type === 'FOLLOWER')) {
                hosts.push(card);
            }
        }
    } else {
        for (const card of G.battlefield || []) {
            if (card && card.kind === 'SHADOW') hosts.push(card);
        }
        for (const card of G.players[ownerId]?.supportArea || []) {
            if (card) hosts.push(card);
        }
    }

    return hosts.filter((host) => {
        if (!canAttachToCharacter(attachment, host, ownerId)) return false;
        const hostId = host.instanceId || host.id;
        return canPlayCard(
            attachment,
            { G, ctx: { phase }, playerID: ownerId },
            hostId,
            host,
            { ignorePhase: true }
        ).valid;
    });
}

/**
 * Candidats jouables depuis pioche ou défausse (filtre + coût + unicité + toPlay).
 * `attachHost` : si fourni, valide comme attachement sur cet hôte.
 */
export function getDeckOrDiscardPlayCandidates(
    G: GameState,
    ownerId: string,
    filter: string[][],
    phase = 'shadow',
    attachHost?: CardState | null,
    from: 'DECK' | 'DISCARD' | 'DECK_OR_DISCARD' = 'DECK_OR_DISCARD'
): CardState[] {
    const player = G.players[ownerId];
    if (!player) return [];

    const poolCards =
        from === 'DECK'
            ? [...(player.deck || [])]
            : from === 'DISCARD'
              ? [...(player.discard || [])]
              : [...(player.deck || []), ...(player.discard || [])];

    const pool = poolCards.filter(
        (card) => card && cardMatchesTarget(card, filter)
    );

    const hostId = attachHost
        ? attachHost.instanceId || attachHost.id
        : undefined;

    return pool.filter((card) => {
        if (requiresAttachmentTarget(card) && !attachHost) {
            return findLegalAttachmentHosts(G, ownerId, card, phase).length >= 1;
        }
        const check = canPlayCard(
            card,
            { G, ctx: { phase }, playerID: ownerId },
            hostId,
            attachHost || undefined,
            { ignorePhase: true }
        );
        return check.valid;
    });
}

/**
 * Joue une carte depuis la pioche ou la défausse.
 * FP : ajoute le crépuscule ; Ombre : le retire.
 * Compagnons → communauté ; possessions à attacher → hôte (fourni ou unique légal).
 */
export function playCardFromDeckOrDiscard(
    G: GameState,
    ownerId: string,
    cardId: string,
    filter?: string[][],
    phase = 'shadow',
    attachHost?: CardState | null,
    from: 'DECK' | 'DISCARD' | 'DECK_OR_DISCARD' = 'DECK_OR_DISCARD'
): CardState | null {
    const found = findInDeckOrDiscard(G, ownerId, cardId);
    if (!found) return null;
    if (from === 'DECK' && found.source !== 'DECK') return null;
    if (from === 'DISCARD' && found.source !== 'DISCARD') return null;

    const { card, source, index } = found;
    if (filter && !cardMatchesTarget(card, filter)) return null;

    const fpId = G.fpPlayerId || '0';
    const isFP = ownerId === fpId;

    let host = attachHost || null;
    if (requiresAttachmentTarget(card) && !host) {
        const hosts = findLegalAttachmentHosts(G, ownerId, card, phase);
        if (hosts.length === 1) {
            host = hosts[0] || null;
        } else if (hosts.length === 0) {
            return null;
        } else {
            // Plusieurs hôtes : l’appelant doit passer attachHost.
            return null;
        }
    }

    const hostId = host ? host.instanceId || host.id : undefined;
    const check = canPlayCard(
        card,
        { G, ctx: { phase }, playerID: ownerId },
        hostId,
        host || undefined,
        { ignorePhase: true }
    );
    if (!check.valid) return null;

    const player = G.players[ownerId];
    if (!player) return null;

    let removed: CardState | undefined;
    if (source === 'DECK') {
        [removed] = player.deck!.splice(index, 1);
    } else {
        [removed] = player.discard!.splice(index, 1);
    }
    if (!removed) return null;

    const restore = () => {
        if (source === 'DECK') player.deck!.splice(index, 0, removed!);
        else player.discard!.splice(index, 0, removed!);
    };

    const finishPlay = (): CardState => {
        // « To play, add a burden » (Sméagol…) — une fois la carte en jeu.
        applyAutomaticToPlayCosts(G, removed!, ownerId, phase);
        shufflePlayerDeck(G, ownerId);
        return removed!;
    };

    if (isFP) {
        const cost = Number(removed.twilightCost) || 0;
        G.twilightPool = (G.twilightPool || 0) + cost;

        if (host) {
            if (!host.attachments) host.attachments = [];
            host.attachments.push(removed);
            return finishPlay();
        }

        if (removed.type === 'COMPANION') {
            if (!player.fellowshipArea) player.fellowshipArea = [];
            removed.isFaceDown = false;
            player.fellowshipArea.push(removed);
            return finishPlay();
        }

        if (
            removed.type === 'ALLY' ||
            removed.type === 'FOLLOWER' ||
            removed.type === 'ARTIFACT' ||
            removed.type === 'CONDITION' ||
            removed.type === 'POSSESSION'
        ) {
            if (!player.supportArea) player.supportArea = [];
            player.supportArea.push(removed);
            return finishPlay();
        }

        restore();
        G.twilightPool -= cost;
        return null;
    }

    const cost = getEffectiveTwilightCost(
        removed,
        getCurrentSiteIndex(G),
        getWhileTwilightCostModifier(G, removed)
    );
    if ((G.twilightPool || 0) < cost) {
        restore();
        return null;
    }
    G.twilightPool = (G.twilightPool || 0) - cost;

    if (host) {
        if (!host.attachments) host.attachments = [];
        host.attachments.push(removed);
        return finishPlay();
    }

    if (removed.type === 'MINION') {
        if (!G.battlefield) G.battlefield = [];
        G.battlefield.push(removed);
        return finishPlay();
    }
    if (
        removed.type === 'CONDITION' ||
        removed.type === 'POSSESSION' ||
        removed.type === 'ARTIFACT' ||
        removed.type === 'FOLLOWER'
    ) {
        if (!player.supportArea) player.supportArea = [];
        player.supportArea.push(removed);
        return finishPlay();
    }

    restore();
    G.twilightPool += cost;
    return null;
}

/** Candidats pioche matchant le filtre (recherche → défausse, pas « jouer »). */
export function getDeckSearchToDiscardCandidates(
    G: GameState,
    ownerId: string,
    filter: string[][]
): CardState[] {
    const player = G.players[ownerId];
    if (!player?.deck?.length) return [];
    return player.deck.filter(
        (card) => card && cardMatchesTarget(card, filter)
    );
}

/**
 * Place une carte de la pioche en défausse (filtre), puis mélange.
 * Retourne la carte déplacée ou null.
 */
export function searchDeckCardToDiscard(
    G: GameState,
    ownerId: string,
    cardId: string,
    filter?: string[][]
): CardState | null {
    const player = G.players[ownerId];
    if (!player?.deck) return null;
    const index = player.deck.findIndex((c) => matchCard(c, cardId));
    if (index < 0) return null;
    const card = player.deck[index];
    if (!card) return null;
    if (filter && !cardMatchesTarget(card, filter)) return null;

    const [removed] = player.deck.splice(index, 1);
    if (!removed) return null;
    placeCardIntoDiscardPile(G, ownerId, removed);
    shufflePlayerDeck(G, ownerId);
    return removed;
}
