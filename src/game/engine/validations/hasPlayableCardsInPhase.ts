// src/game/engine/validations/hasPlayableCardsInPhase.ts

import type { GameState } from '../../types';
import { canPlayCard } from '../canPlayCard';

export function hasPlayableCardsInPhase(
    G: GameState,
    phaseName: string,
    playerID: string
): boolean {
    const player = G.players[playerID];
    if (!player) return false;

    const context = {
        G,
        ctx: { phase: phaseName, currentPlayer: playerID },
        playerID,
    };

    // 1. Scanner les cartes en main
    if (player.hand) {
        for (const card of player.hand) {
            if (canPlayCard(card, context).valid) {
                return true;
            }
        }
    }

    // 2. Scanner les cartes sur le plateau (fellowshipArea, supportArea, battlefield)
    const cardsInPlay = [
        ...(player.fellowshipArea || []),
        ...(player.supportArea || []),
        ...(G.battlefield || []),
    ];

    for (const card of cardsInPlay) {
        if (!card) continue;
        if (canPlayCard(card, context).valid) {
            return true;
        }
        // Scanner également les cartes attachées
        if (card.attachments) {
            for (const att of card.attachments) {
                if (att && canPlayCard(att, context).valid) {
                    return true;
                }
            }
        }
    }

    return false;
}