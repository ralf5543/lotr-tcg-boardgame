// src/game/engine/canUseAbility.ts

import type { CardState, GameState } from '../types';
import { getKeywordValue } from './keywords/keywordUtils';
import { isSkirmishActionWindowOpen } from './skirmishActionWindow';
import { canActInActionWindow } from './actionWindow';
export interface ValidationContext {
    G: GameState;
    ctx: { phase?: string; currentPlayer?: string };
    playerID: string;
}

export interface ValidationResult {
    valid: boolean;
    reason?: string;
}

/**
 * Vérifie si une carte DÉJÀ EN JEU (ou un attachement) peut utiliser un effet / capacité / mot-clé.
 */
export function canUseAbility(
    card: CardState,
    context: ValidationContext
): ValidationResult {
    const { ctx, playerID, G } = context;
    const rawPhase = ctx.phase || '';
    const currentPhase = rawPhase.toUpperCase();
    // camelCase boardgame.io ("startOfRegroup") → SNAKE_CASE ("START_OF_REGROUP")
    const normalizedPhase = rawPhase
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toUpperCase();
    const fpPlayerId = G.fpPlayerId || '0';

    // 1. Contrôle du joueur (Peuples Libres vs Ombre)
    if (card.kind === 'FREE_PEOPLE' && playerID !== fpPlayerId) {
        return {
            valid: false,
            reason: 'Seul le joueur des Peuples Libres peut utiliser cette capacité.',
        };
    }
    if (card.kind === 'SHADOW' && playerID === fpPlayerId) {
        return {
            valid: false,
            reason: "Seul le joueur de l'Ombre peut utiliser cette capacité.",
        };
    }

    // 2. Traitement du mot-clé MUSTER en phase START_OF_REGROUP / REGROUP
    if (
        currentPhase === 'START_OF_REGROUP' ||
        currentPhase === 'REGROUP' ||
        normalizedPhase === 'START_OF_REGROUP' ||
        normalizedPhase === 'REGROUP'
    ) {
        const hasMuster = getKeywordValue(card, 'MUSTER') >= 0;
        if (hasMuster) {
            return { valid: true };
        }
    }

    // 3. Traitement des capacités avec phases explicites (actionPhases)
    if (Array.isArray(card.actionPhases) && card.actionPhases.length > 0) {
        const allowedActionPhases = card.actionPhases.map((p) =>
            p.toUpperCase()
        );

        if (
            !allowedActionPhases.includes(currentPhase) &&
            !allowedActionPhases.includes(normalizedPhase)
        ) {
            return {
                valid: false,
                reason: `Cette capacité ne peut être activée qu'en phase : ${card.actionPhases.join(', ')}.`,
            };
        }

        if (
            (currentPhase === 'SKIRMISH' || normalizedPhase === 'SKIRMISH') &&
            allowedActionPhases.includes('SKIRMISH') &&
            !isSkirmishActionWindowOpen(G)
        ) {
            return {
                valid: false,
                reason: 'Les actions de combat ne peuvent être utilisées que pendant une escarmouche en cours.',
            };
        }

        if (!canActInActionWindow(G, playerID)) {
            return {
                valid: false,
                reason: "Ce n'est pas à vous d'agir.",
            };
        }
        return { valid: true };
    }

    return {
        valid: false,
        reason: 'Aucune capacité activable pour cette carte dans la phase actuelle.',
    };
}
