import type { CardState, GameState } from '../types';
import { addThreats } from './threats';
import {
    placeCultureTokens,
    tokenCountOnCard,
} from './cultureTokens';
import { shufflePlayerDeck } from './playFromOutOfPlay';
import { findTargetCard } from '../../utils/cardUtils';
import { discardCardFromPlay } from '../../utils/discardCardFromPlay';
import { discardCardsFromHand } from '../engine/abilities/payAbilityCost';

function putHandUnderDeck(
    G: GameState,
    ownerId: string,
    kind: 'SHADOW' | 'FREE_PEOPLE'
): CardState[] {
    const player = G.players[ownerId];
    if (!player) return [];
    if (!player.deck) player.deck = [];
    if (!player.hand) player.hand = [];
    const moved: CardState[] = [];
    player.hand = player.hand.filter((card) => {
        if (!card || card.kind !== kind) return true;
        moved.push(card);
        return false;
    });
    if (moved.length > 0) {
        player.deck.push(...moved);
    }
    return moved;
}

/**
 * Après validation UI de `pendingReveal` : menaces / jetons / mélange
 * (pioche) ou sous-pioche + défausse source (main).
 * `discardCardId` : défausse optionnelle d’une carte révélée (Alive and Unspoiled…).
 */
export function confirmPendingReveal(
    G: GameState,
    playerID: string,
    discardCardId?: string
): boolean {
    const pending = G.pendingReveal;
    if (!pending) return false;
    const viewerId = pending.viewerId || pending.playerId;
    if (viewerId !== playerID) return false;

    const zone = pending.zone || 'DECK_TOP';
    const subjectId = pending.subjectPlayerId || pending.opponentId;

    if (zone === 'HAND') {
        const aftermath = pending.aftermath;
        if (discardCardId) {
            if (!aftermath?.mayDiscardOne) return false;
            if (!pending.cardIds.includes(discardCardId)) return false;
            if (!discardCardsFromHand(G, subjectId, [discardCardId])) {
                return false;
            }
            const discarded = findTargetCard(G, discardCardId) as CardState | null;
            // La carte est déjà en défausse ; retrouver le nom via la pile.
            const inDiscard = (G.players[subjectId]?.discard || []).find(
                (c) => c.instanceId === discardCardId || c.id === discardCardId
            );
            const name =
                inDiscard?.i18n?.fr?.title ||
                inDiscard?.title ||
                discarded?.i18n?.fr?.title ||
                discarded?.title ||
                discardCardId;
            G.statusMessage = `Carte révélée défaussée : ${name}.`;
            G.pendingReveal = undefined;
            return true;
        }
        let moved: CardState[] = [];
        if (aftermath?.putHandUnderDeck) {
            moved = putHandUnderDeck(
                G,
                subjectId,
                aftermath.putHandUnderDeck
            );
        }
        if (aftermath?.discardSource) {
            const source = findTargetCard(G, pending.sourceInstanceId);
            if (source && source.type) {
                discardCardFromPlay(G, source as CardState);
            }
        }
        if (aftermath?.mayDiscardOne) {
            G.statusMessage = 'Révélation validée sans défausse.';
        } else if (moved.length > 0) {
            const names = moved
                .map(
                    (c) =>
                        c.i18n?.fr?.title ||
                        c.title ||
                        c.id
                )
                .join(', ');
            G.statusMessage = `Main révélée : ${names} placée${moved.length > 1 ? 's' : ''} sous la pioche.`;
        } else {
            G.statusMessage = 'Main révélée : aucune carte Ombre sous la pioche.';
        }
        G.pendingReveal = undefined;
        return true;
    }

    const opp = G.players[subjectId];
    if (!opp?.deck) {
        G.pendingReveal = undefined;
        return false;
    }

    const revealed = pending.cardIds
        .map((id) =>
            (opp.deck || []).find((c) => c.instanceId === id || c.id === id)
        )
        .filter(Boolean);

    let shadowCount = 0;
    let fpCount = 0;
    for (const card of revealed) {
        if (!card) continue;
        if (card.kind === 'SHADOW') shadowCount += 1;
        else if (card.kind === 'FREE_PEOPLE') fpCount += 1;
    }

    if (pending.perShadowCard?.type === 'ADD_THREATS' && shadowCount > 0) {
        addThreats(G, shadowCount * (pending.perShadowCard.count || 1));
    }

    if (
        pending.perFreePeoplesCard?.type === 'PLACE_CULTURE_TOKEN' &&
        fpCount > 0
    ) {
        const culture = pending.perFreePeoplesCard.culture;
        const conditions = (
            G.players[viewerId]?.supportArea || []
        ).filter(
            (c) =>
                c &&
                c.type === 'CONDITION' &&
                tokenCountOnCard(c, culture) > 0
        );
        const pickId = pending.conditionId;
        const host =
            (pickId &&
                conditions.find(
                    (c) => c.instanceId === pickId || c.id === pickId
                )) ||
            conditions[0];
        if (host) {
            placeCultureTokens(host, culture, fpCount);
        }
    }

    shufflePlayerDeck(G, subjectId);
    G.statusMessage = `Révélation validée : ${shadowCount} Ombre → menace(s), ${fpCount} PL → jeton(s). Pioche mélangée.`;
    G.pendingReveal = undefined;
    return true;
}
