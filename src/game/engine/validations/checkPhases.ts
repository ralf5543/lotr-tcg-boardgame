// src/game/engine/validations/checkPhases.ts

import type { CardState } from '../../types';

export interface ValidationContext {
    G: any;
    ctx: { phase?: string; currentPlayer?: string };
    playerID: string;
}

export function checkPhases(
    card: CardState,
    context: ValidationContext
): { valid: boolean; reason?: string } {
    const { ctx, playerID, G } = context;
    const currentPhase = (ctx.phase || '').toUpperCase();
    const fpPlayerId = G.fpPlayerId || '0';

    // 1. Vérification du Rôle Joueur (Free People vs Shadow)
    if (card.kind === 'FREE_PEOPLE') {
        if (playerID !== fpPlayerId) {
            return {
                valid: false,
                reason: 'Seul le joueur des Peuples Libres peut jouer cette carte.',
            };
        }
    } else if (card.kind === 'SHADOW') {
        if (playerID === fpPlayerId) {
            return {
                valid: false,
                reason: "Seul le joueur de l'Ombre peut jouer cette carte.",
            };
        }
    }

    // 2. ÉVÉNEMENTS (type === 'EVENT') : Doivent respecter card.phases s'il existe
    if (card.type === 'EVENT') {
        if (Array.isArray(card.phases) && card.phases.length > 0) {
            const allowedPhases = card.phases.map((p) => p.toUpperCase());
            if (!allowedPhases.includes(currentPhase)) {
                return {
                    valid: false,
                    reason: `Cet Événement ne peut être joué qu'en phase : ${card.phases.join(', ')}.`,
                };
            }
            return { valid: true };
        }
    }

    // 3. CARTES PERMANENTES (Companion, Condition, Possession, Minion, Ally, etc.)
    // Elles se jouent durant la phase principale standard de leur alignement.
    if (card.kind === 'FREE_PEOPLE' && currentPhase !== 'FELLOWSHIP') {
        return {
            valid: false,
            reason: 'Les cartes Peuples Libres se jouent en phase de Communauté (Fellowship).',
        };
    }

    if (card.kind === 'SHADOW' && currentPhase !== 'SHADOW') {
        return {
            valid: false,
            reason: "Les cartes de l'Ombre se jouent en phase d'Ombre (Shadow).",
        };
    }

    return { valid: true };
}