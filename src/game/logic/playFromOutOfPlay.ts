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

export type DeckOrDiscardSource = 'DECK' | 'DISCARD' | 'DEAD_PILE';

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

    const deadIndex = (player.deadPile || []).findIndex((c) =>
        matchCard(c, cardId)
    );
    if (deadIndex >= 0) {
        const card = player.deadPile![deadIndex];
        if (card) return { card, source: 'DEAD_PILE', index: deadIndex };
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
            { ignorePhase: true, ignoreTwilightPool: true }
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
    from: PlayFromSource = 'DECK_OR_DISCARD'
): CardState[] {
    const player = G.players[ownerId];
    if (!player) return [];

    const poolCards = getPlayFromPool(G, ownerId, from);

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
            { ignorePhase: true, ignoreTwilightPool: true }
        );
        return check.valid;
    });
}

export type PlayFromSource =
    | 'DECK'
    | 'DISCARD'
    | 'DECK_OR_DISCARD'
    | 'DEAD_PILE';

/** Pile(s) d’où une carte peut être jouée (pioche / défausse / pile de mort). */
export function getPlayFromPool(
    G: GameState,
    ownerId: string,
    from: PlayFromSource
): CardState[] {
    const player = G.players[ownerId];
    if (!player) return [];
    switch (from) {
        case 'DECK':
            return [...(player.deck || [])];
        case 'DISCARD':
            return [...(player.discard || [])];
        case 'DEAD_PILE':
            return [...(player.deadPile || [])];
        default:
            return [...(player.deck || []), ...(player.discard || [])];
    }
}

/** Coût crépuscule effectif d’une carte jouée par l’Ombre, réduction déduite. */
function shadowPlayCost(G: GameState, card: CardState, twilightReduce = 0): number {
    const cost = getEffectiveTwilightCost(
        card,
        getCurrentSiteIndex(G),
        getWhileTwilightCostModifier(G, card)
    );
    return Math.max(0, cost - (twilightReduce || 0));
}

/** Cartes de la main que le joueur peut jouer via une capacité « play… ». */
export function getHandPlayCandidates(
    G: GameState,
    ownerId: string,
    filter: string[][],
    phase = 'shadow',
    twilightReduce = 0
): CardState[] {
    const player = G.players[ownerId];
    if (!player?.hand) return [];
    const fpId = G.fpPlayerId || '0';
    const pool = (G.twilightPool || 0);

    return player.hand.filter((card) => {
        if (!card || !cardMatchesTarget(card, filter)) return false;
        const check = canPlayCard(
            card,
            { G, ctx: { phase }, playerID: ownerId },
            undefined,
            undefined,
            { ignorePhase: true, ignoreTwilightPool: true }
        );
        if (!check.valid) return false;
        if (ownerId !== fpId) {
            return shadowPlayCost(G, card, twilightReduce) <= pool;
        }
        return true;
    });
}

/**
 * Joue une carte depuis la main du joueur (capacité « play… » d’un site).
 * Ombre : paie le coût effectif (− réduction) ; FP : ajoute le crépuscule.
 */
export function playCardFromHand(
    G: GameState,
    ownerId: string,
    cardId: string,
    filter?: string[][],
    phase = 'shadow',
    twilightReduce = 0
): CardState | null {
    const player = G.players[ownerId];
    if (!player?.hand) return null;
    const index = player.hand.findIndex((c) => matchCard(c, cardId));
    if (index < 0) return null;
    const card = player.hand[index];
    if (!card) return null;
    if (filter && !cardMatchesTarget(card, filter)) return null;

    const check = canPlayCard(
        card,
        { G, ctx: { phase }, playerID: ownerId },
        undefined,
        undefined,
        { ignorePhase: true, ignoreTwilightPool: true }
    );
    if (!check.valid) return null;

    const fpId = G.fpPlayerId || '0';
    const isFP = ownerId === fpId;
    const [removed] = player.hand.splice(index, 1);
    if (!removed) return null;
    const restore = () => {
        player.hand.splice(index, 0, removed);
    };

    const finishPlay = (): CardState => {
        applyAutomaticToPlayCosts(G, removed, ownerId, phase);
        return removed;
    };

    if (isFP) {
        const cost = Number(removed.twilightCost) || 0;
        G.twilightPool = (G.twilightPool || 0) + cost;

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

    const cost = shadowPlayCost(G, removed, twilightReduce);
    if ((G.twilightPool || 0) < cost) {
        restore();
        return null;
    }
    G.twilightPool = (G.twilightPool || 0) - cost;

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
    from: PlayFromSource = 'DECK_OR_DISCARD'
): CardState | null {
    const found = findInDeckOrDiscard(G, ownerId, cardId);
    if (!found) return null;
    if (from === 'DECK' && found.source !== 'DECK') return null;
    if (from === 'DISCARD' && found.source !== 'DISCARD') return null;
    if (from === 'DEAD_PILE' && found.source !== 'DEAD_PILE') return null;

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
        { ignorePhase: true, ignoreTwilightPool: true }
    );
    if (!check.valid) return null;

    const player = G.players[ownerId];
    if (!player) return null;

    let removed: CardState | undefined;
    if (source === 'DECK') {
        [removed] = player.deck!.splice(index, 1);
    } else if (source === 'DISCARD') {
        [removed] = player.discard!.splice(index, 1);
    } else {
        [removed] = player.deadPile!.splice(index, 1);
        // Ressuscité : la carte n’est plus morte.
        if (removed) {
            removed.isDead = false;
            removed.wounds = 0;
        }
    }
    if (!removed) return null;

    const restore = () => {
        if (source === 'DECK') player.deck!.splice(index, 0, removed!);
        else if (source === 'DISCARD')
            player.discard!.splice(index, 0, removed!);
        else player.deadPile!.splice(index, 0, removed!);
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
