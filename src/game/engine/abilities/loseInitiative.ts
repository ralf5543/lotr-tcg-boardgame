import type { Ability, CardState, GameState } from '../../types';
import {
    abilityOwnerPlayerId,
    canPayAbilityCost,
} from './payAbilityCost';
import { forEachInPlayCard } from './resolveCostTarget';
import { abilityHasLegalEffectTarget } from './designation';
import { pauseActionYieldForResponses } from '../responseWindow';

function isLoseInitiativeAbility(ability: Ability): boolean {
    return ability.trigger?.type === 'LOSE_INITIATIVE';
}

/**
 * Each time you lose initiative… (A Light in His Mind…) → toaster Activer /
 * Passer via pendingWhenPlayed.
 */
export function maybeOfferLoseInitiativeResponse(G: GameState): void {
    if (G.pendingWhenPlayed) return;
    const fpId = G.fpPlayerId || '0';

    forEachInPlayCard(G, (source: CardState) => {
        if (G.pendingWhenPlayed) return;
        for (const ability of source.abilities || []) {
            if (!isLoseInitiativeAbility(ability) || !ability.optional) {
                continue;
            }
            const ownerId = abilityOwnerPlayerId(G, source) || fpId;
            // « you lose initiative » = le camp FP (initiative King block).
            if (String(ownerId) !== String(fpId)) continue;
            if ((G.players[fpId]?.burdens || 0) < 1) continue;
            if (!canPayAbilityCost(G, source, ability.cost, ownerId)) {
                continue;
            }
            if (
                !abilityHasLegalEffectTarget(G, source, ability, ownerId)
            ) {
                continue;
            }
            const sourceId = source.instanceId || source.id;
            if (!sourceId) continue;
            G.pendingWhenPlayed = {
                playerId: ownerId,
                sourceInstanceId: sourceId,
                abilityId: ability.id,
            };
            G.statusMessage =
                'Vous pouvez activer l’effet optionnel de cette carte.';
            pauseActionYieldForResponses(G, ownerId);
            return;
        }
    });
}
