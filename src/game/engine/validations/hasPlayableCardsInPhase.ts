// src/game/engine/validations/hasPlayableCardsInPhase.ts

import type { GameState } from '../../types';
import { canPlayCard } from '../canPlayCard';
import { getKeywordValue } from '../keywords/keywordUtils';

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

    const currentPhaseUpper = phaseName.toUpperCase();
    const fpPlayerId = G.fpPlayerId || '0';

    // 1. SCAN DE LA MAIN (Pose de carte classique)
    if (player.hand && player.hand.length > 0) {
        for (const card of player.hand) {
            if (!card) continue;
            const res = canPlayCard(card, context);
            if (res.valid) {
                return true;
            }
        }
    }

    // 2. SCAN DU PLATEAU (Capacités & Muster)
    const cardsInPlay = [
        ...(player.fellowshipArea || []),
        ...(player.supportArea || []),
        ...(G.battlefield || []),
    ];

    for (const card of cardsInPlay) {
        if (!card) continue;

        // Contrôle de rôle du joueur
        const isOwner = card.kind === 'FREE_PEOPLE' 
            ? playerID === fpPlayerId 
            : playerID !== fpPlayerId;

        if (!isOwner) continue; // Si la carte n'appartient pas au joueur scanné, on passe

        // Check MUSTER en phase START_OF_REGROUP
        if (currentPhaseUpper === 'START_OF_REGROUP') {
            const hasMuster = getKeywordValue(card, 'MUSTER') >= 0;
            if (hasMuster) {
                return true;
            }
        }

        // Check actionPhases standard
        if (Array.isArray(card.actionPhases)) {
            const hasMatchingPhase = card.actionPhases.some(
                (p) => p.toUpperCase() === currentPhaseUpper
            );
            if (hasMatchingPhase) {
                return true;
            }
        }

        // Scan des attachements
        if (card.attachments) {
            for (const att of card.attachments) {
                if (!att) continue;
                const attOwner = att.kind === 'FREE_PEOPLE' 
                    ? playerID === fpPlayerId 
                    : playerID !== fpPlayerId;

                if (!attOwner) continue;

                if (currentPhaseUpper === 'START_OF_REGROUP' && getKeywordValue(att, 'MUSTER') >= 0) {
                    return true;
                }
            }
        }
    }
    return false;
}