import type { CardState, LotrMoveContext } from '../types';
import { canUseAbility } from '../engine/canUseAbility';
import {
    abilityNeedsSiteReplace,
    abilityNeedsSiteExchange,
    applyAbilityEffect,
    abilityReplaceSiteEffect,
} from '../engine/abilities/applyAbilityEffect';
import {
    abilityNeedsHandDiscard,
    canPayAbilityCost,
    payAbilityCost,
} from '../engine/abilities/payAbilityCost';
import { abilityMatchesPhase } from '../engine/abilities/collectAbilities';
import { yieldPriorityAfterAction } from '../engine/actionWindow';
import { findTargetCard } from '../../utils/cardUtils';
import {
    abilityNeedsCostDesignation,
    abilityNeedsEffectDesignation,
    getEffectDesignationCount,
} from '../engine/abilities/designation';
import {
    afterResponseResolved,
    isResponseWindowOpen,
    pauseActionYieldForResponses,
    flushPendingPhaseAfterResponse,
    responseAbilityStillAvailable,
} from '../engine/responseWindow';
import { abilityMeetsPlayRestrictions } from '../engine/abilities/abilityRestrictions';

function normalizeChosenIds(chosen?: string | string[]): string[] {
    if (!chosen) return [];
    return Array.isArray(chosen) ? chosen.filter(Boolean) : [chosen];
}

export const activateAbility = (
    { G, ctx, playerID, events }: LotrMoveContext,
    sourceInstanceId: string,
    abilityId: string,
    chosenTargetId?: string,
    discardedHandIds?: string[],
    chosenEffectTargetId?: string | string[]
) => {
    const source = findTargetCard(G, sourceInstanceId) as CardState | null;
    if (!source) return 'INVALID_MOVE';

    const ability = source.abilities?.find((ab) => ab.id === abilityId);
    if (!ability) return 'INVALID_MOVE';

    const context = { G, ctx, playerID: String(playerID) };
    if (!canUseAbility(source, context).valid) return 'INVALID_MOVE';
    const phaseToMatch = isResponseWindowOpen(G) ? 'RESPONSE' : ctx.phase || '';
    if (!abilityMatchesPhase(ability, phaseToMatch)) return 'INVALID_MOVE';
    if (
        isResponseWindowOpen(G) &&
        !responseAbilityStillAvailable(G, source, ability)
    ) {
        return 'INVALID_MOVE';
    }
    if (!abilityMeetsPlayRestrictions(G, source, ability)) return 'INVALID_MOVE';
    if (!canPayAbilityCost(G, source, ability.cost)) return 'INVALID_MOVE';
    const needsCostDesignation = abilityNeedsCostDesignation(
        G,
        source,
        ability
    );
    const needsEffectDesignation = abilityNeedsEffectDesignation(
        G,
        source,
        ability
    );
    if (needsCostDesignation && !chosenTargetId) {
        return 'INVALID_MOVE';
    }
    if (needsEffectDesignation) {
        const need = getEffectDesignationCount(G, source, ability);
        const provided = normalizeChosenIds(
            needsCostDesignation ? chosenEffectTargetId : chosenTargetId
        );
        if (provided.length !== need) {
            return 'INVALID_MOVE';
        }
    }
    if (abilityNeedsHandDiscard(ability) && !discardedHandIds?.length) {
        return 'INVALID_MOVE';
    }
    if (abilityNeedsSiteReplace(ability)) {
        const effect = abilityReplaceSiteEffect(ability);
        const ids = normalizeChosenIds(
            chosenEffectTargetId ?? chosenTargetId
        );
        if (effect?.scope === 'REGION') {
            if (ids.length < 2) return 'INVALID_MOVE';
        } else if (ids.length < 1) {
            return 'INVALID_MOVE';
        }
    }
    if (abilityNeedsSiteExchange(ability)) {
        const ids = normalizeChosenIds(
            chosenEffectTargetId ?? chosenTargetId
        );
        if (ids.length < 2) return 'INVALID_MOVE';
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
    const effectTargetId = needsCostDesignation
        ? chosenEffectTargetId
        : chosenTargetId;
    if (
        !applyAbilityEffect(
            G,
            source,
            ability,
            effectTargetId,
            discardedHandIds
        )
    ) {
        return 'INVALID_MOVE';
    }

    if (ability.omitFromArcheryTotal) {
        source.omitFromArcheryTotal = true;
    }

    if (wasResponseWindowOpen && isResponseAbility) {
        afterResponseResolved(G, String(playerID), ability, source);
        flushPendingPhaseAfterResponse(G, events);
        return;
    }

    if (isResponseWindowOpen(G) && !wasResponseWindowOpen) {
        pauseActionYieldForResponses(G, String(playerID));
        return;
    }

    yieldPriorityAfterAction(G, String(playerID));
    const title = source.i18n?.fr?.title || source.title || source.id;
    G.statusMessage = `${title} active une capacité.`;
};

export const abilityMoves = {
    activateAbility,
};
