import type { CardState, LotrMoveContext } from '../types';
import { canUseAbility } from '../engine/canUseAbility';
import {
    abilityNeedsHandDiscard,
    canPayAbilityCost,
    payAbilityCost,
} from '../engine/abilities/payAbilityCost';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { abilityMatchesPhase } from '../engine/abilities/collectAbilities';
import { yieldPriorityAfterAction } from '../engine/actionWindow';
import { findTargetCard } from '../../utils/cardUtils';
import { abilityNeedsDesignation } from '../engine/abilities/designation';
import { afterResponseResolved, isResponseWindowOpen, pauseActionYieldForResponses } from '../engine/responseWindow';

export const activateAbility = (
    { G, ctx, playerID }: LotrMoveContext,
    sourceInstanceId: string,
    abilityId: string,
    chosenTargetId?: string,
    discardedHandIds?: string[]
) => {
    const source = findTargetCard(G, sourceInstanceId) as CardState | null;
    if (!source) return 'INVALID_MOVE';

    const ability = source.abilities?.find((ab) => ab.id === abilityId);
    if (!ability) return 'INVALID_MOVE';

    const context = { G, ctx, playerID };
    if (!canUseAbility(source, context).valid) return 'INVALID_MOVE';
    const phaseToMatch = isResponseWindowOpen(G) ? 'RESPONSE' : ctx.phase || '';
    if (!abilityMatchesPhase(ability, phaseToMatch)) return 'INVALID_MOVE';
    if (!canPayAbilityCost(G, source, ability.cost)) return 'INVALID_MOVE';
    if (abilityNeedsDesignation(G, source, ability) && !chosenTargetId) {
        return 'INVALID_MOVE';
    }
    if (abilityNeedsHandDiscard(ability) && !discardedHandIds?.length) {
        return 'INVALID_MOVE';
    }
    const wasResponseWindowOpen = isResponseWindowOpen(G);
    const isResponseAbility = abilityMatchesPhase(ability, 'RESPONSE');

    if (
        !payAbilityCost(
            G,
            source,
            ability.cost,
            chosenTargetId,
            discardedHandIds
        )
    ) {
        return 'INVALID_MOVE';
    }
    if (!applyAbilityEffect(G, source, ability, chosenTargetId)) {
        return 'INVALID_MOVE';
    }

    if (ability.omitFromArcheryTotal) {
        source.omitFromArcheryTotal = true;
    }

    if (wasResponseWindowOpen && isResponseAbility) {
        afterResponseResolved(G, playerID, ability);
        return;
    }

    if (isResponseWindowOpen(G) && !wasResponseWindowOpen) {
        pauseActionYieldForResponses(G, playerID);
        return;
    }

    yieldPriorityAfterAction(G, playerID);
    const title = source.i18n?.fr?.title || source.title || source.id;
    G.statusMessage = `${title} active une capacité.`;
};

export const abilityMoves = {
    activateAbility,
};
