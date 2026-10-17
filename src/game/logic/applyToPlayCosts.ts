import type { CardState, CostOption, GameState } from '../types';
import { validateToPlayOption } from '../engine/validations/checkToPlayConditions';
import { addThreats } from './threats';

/**
 * Applique les coûts « To play » automatiques de la première option valide
 * (add burden / threats, remove…). Spot / exert à désigner restent ailleurs.
 */
export function applyAutomaticToPlayCosts(
    G: GameState,
    card: CardState,
    ownerId: string,
    phase?: string
): CostOption | null {
    const playContext = { G, ctx: { phase }, playerID: ownerId };
    const chosen = (card.toPlay || []).find(
        (opt) => validateToPlayOption(opt, card, playContext).valid
    );
    if (!chosen) return null;

    const fpId = G.fpPlayerId || '0';
    const fpPlayer = G.players[fpId];

    if (chosen.addBurdens && chosen.addBurdens > 0 && fpPlayer) {
        fpPlayer.burdens = (fpPlayer.burdens || 0) + chosen.addBurdens;
    }
    if (chosen.removeBurdens && chosen.removeBurdens > 0 && fpPlayer) {
        fpPlayer.burdens = Math.max(
            0,
            (fpPlayer.burdens || 0) - chosen.removeBurdens
        );
    }
    if (chosen.addThreats && chosen.addThreats > 0) {
        addThreats(G, chosen.addThreats);
    }
    if (chosen.removeThreats && chosen.removeThreats > 0 && fpPlayer) {
        fpPlayer.threats = Math.max(
            0,
            (fpPlayer.threats || 0) - chosen.removeThreats
        );
    }

    return chosen;
}
