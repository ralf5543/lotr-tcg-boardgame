import type { CardState, SiteCardState, GameState } from '../../types';

export interface AidValidationResult {
    valid: boolean;
    reason?: string;
}

export function canTransferAid(
    follower: CardState,
    targetCard: CardState | SiteCardState,
    G: GameState,
    playerID: string
): AidValidationResult {
    if (!follower || follower.type !== 'FOLLOWER') {
        return { valid: false, reason: "La carte n'est pas un Follower." };
    }

    if (!follower.aidCost) {
        return {
            valid: false,
            reason: "Ce Follower ne possède pas de coût d'Aide (Aid).",
        };
    }

    const fpPlayerId = G.fpPlayerId || '0';
    const isFP = playerID === fpPlayerId;

    // 1. Vérification du coût (Twilight, Threat, Burden)
    const { type, amount } = follower.aidCost;

    if (type === 'TWILIGHT' && !isFP) {
        // Un joueur Shadow doit payer du Twilight depuis la réserve
        if ((G.twilightPool || 0) < amount) {
            return {
                valid: false,
                reason: `Crépuscule insuffisant (${G.twilightPool || 0}/${amount}).`,
            };
        }
    }

    // 2. Validation du type de cible pour un Follower
    const isTargetValid =
        follower.kind === 'FREE_PEOPLE'
            ? targetCard.type === 'COMPANION'
            : targetCard.type === 'MINION';

    if (!isTargetValid) {
        return {
            valid: false,
            reason:
                follower.kind === 'FREE_PEOPLE'
                    ? 'Un Suivant des Peuples Libres doit être attaché à un Compagnon.'
                    : "Un Suivant de l'Ombre doit être attaché à un Séide.",
        };
    }

    return { valid: true };
}
