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

    // 2. CAPACITÉS / ACTIONS (Carte déjà sur le plateau)
    // Si la carte n'est pas dans la main, on valide son activation via actionPhases
    const isAlreadyInPlay = card.location && card.location !== 'hand';
    if (isAlreadyInPlay) {
        if (Array.isArray(card.actionPhases) && card.actionPhases.length > 0) {
            const allowedActionPhases = card.actionPhases.map((p) =>
                p.toUpperCase()
            );
            if (!allowedActionPhases.includes(currentPhase)) {
                return {
                    valid: false,
                    reason: `Cette capacité ne peut être activée qu'en phase : ${card.actionPhases.join(', ')}.`,
                };
            }
            return { valid: true };
        }
    }

    // 3. ÉVÉNEMENTS (type === 'EVENT', joués de la main) : Doivent respecter card.phases s'il existe
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

    // 4. POSE DE CARTES PERMANENTES DEPUIS LA MAIN
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
