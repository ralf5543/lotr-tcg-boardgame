import type { GameState } from '../types';
import { addThreats } from './threats';
import {
    placeCultureTokens,
    tokenCountOnCard,
} from './cultureTokens';
import { shufflePlayerDeck } from './playFromOutOfPlay';

/**
 * Après validation UI de `pendingReveal` : menaces, jetons, mélange.
 */
export function confirmPendingReveal(
    G: GameState,
    playerID: string
): boolean {
    const pending = G.pendingReveal;
    if (!pending || pending.playerId !== playerID) return false;

    const opp = G.players[pending.opponentId];
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
            G.players[pending.playerId]?.supportArea || []
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

    shufflePlayerDeck(G, pending.opponentId);
    G.statusMessage = `Révélation validée : ${shadowCount} Ombre → menace(s), ${fpCount} PL → jeton(s). Pioche mélangée.`;
    G.pendingReveal = undefined;
    return true;
}
