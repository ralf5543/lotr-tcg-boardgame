import type { CardState, LotrMoveContext } from '../types';
import { canUseAbility } from '../engine/canUseAbility';
import {
    abilityNeedsSiteReplace,
    abilityNeedsSiteExchange,
    abilityNeedsStackSiteChoice,
    abilityStacksOtherMinion,
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
import { appendAbilityUsedJournal } from '../logic/journal';
import { findTargetCard } from '../../utils/cardUtils';
import {
    abilityHasLegalEffectTarget,
    abilityNeedsCostDesignation,
    abilityNeedsEffectDesignation,
    getEffectDesignationCandidates,
    getEffectDesignationCount,
} from '../engine/abilities/designation';
import {
    afterResponseResolved,
    isResponseWindowOpen,
    pauseActionYieldForResponses,
    flushPendingPhaseAfterResponse,
    requestAboutToUseAbility,
    responseAbilityStillAvailable,
    tryOpenPutsOnTheOneRing,
} from '../engine/responseWindow';
import { abilityMeetsPlayRestrictions } from '../engine/abilities/abilityRestrictions';
import { recordAbilityUseThisPhase } from '../logic/abilityPhaseUses';
import { afterSiteStartAbilityResolved } from '../logic/siteStartAbility';
import { hasActionableStartOfPhaseCards } from '../logic/hasActionableStartOfPhaseCards';
import { tryExitStartOfManeuver } from './maneuverMoves';
import { exitStartOf } from '../logic/phaseEntry';
import { dismissOwnOptionalPromptsAsPass } from '../logic/interactionCleanup';

function normalizeChosenIds(chosen?: string | string[]): string[] {
    if (!chosen) return [];
    return Array.isArray(chosen) ? chosen.filter(Boolean) : [chosen];
}

/**
 * Après une capacité en startOf* : si plus rien d’activable pour ce joueur,
 * marquer isDone (comme transferAid) et enchaîner si l’adversaire a fini.
 */
function syncStartOfPhaseAfterAbility(
    G: LotrMoveContext['G'],
    ctx: LotrMoveContext['ctx'],
    events: LotrMoveContext['events'],
    playerID: string
): void {
    const phase = ctx.phase || '';
    if (!phase.startsWith('startOf')) return;
    if (!G.startOfPhaseState?.players?.[playerID]) return;

    const remaining = hasActionableStartOfPhaseCards(
        G.players[playerID],
        G,
        playerID,
        phase
    );
    if (remaining) return;

    G.startOfPhaseState.players[playerID].isDone = true;

    if (phase === 'startOfManeuver') {
        tryExitStartOfManeuver(G, events);
        return;
    }

    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';
    const fpDone = G.startOfPhaseState.players[fpId]?.isDone;
    const shadowDone = G.startOfPhaseState.players[shadowId]?.isDone;
    if (!fpDone || !shadowDone) return;

    G.startOfPhaseState = undefined;
    const targetPhase = phase
        .replace(/^startOf/, '')
        .replace(/^./, (str) => str.toLowerCase());
    exitStartOf(events, targetPhase);
}

export const activateAbility = (
    { G, ctx, playerID, events }: LotrMoveContext,
    sourceInstanceId: string,
    abilityId: string,
    chosenTargetId?: string | string[],
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
    const actorId = String(playerID);

    // Activer le site du toaster courant : ne pas le passer sous soi.
    const resolvingSiteStart =
        G.pendingSiteStartAbility?.playerId === actorId &&
        G.pendingSiteStartAbility.abilityId === abilityId &&
        G.pendingSiteStartAbility.siteInstanceId === sourceInstanceId;
    if (!resolvingSiteStart) {
        dismissOwnOptionalPromptsAsPass(G, actorId, events);
    }
    if (!canPayAbilityCost(G, source, ability.cost, actorId)) {
        return 'INVALID_MOVE';
    }
    // Cible d’effet invalide (ex. blessure impossible) → pas de paiement de coût.
    if (!abilityHasLegalEffectTarget(G, source, ability, actorId)) {
        return 'INVALID_MOVE';
    }
    const needsCostDesignation = abilityNeedsCostDesignation(
        G,
        source,
        ability,
        actorId
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
        const siteExtra =
            abilityNeedsStackSiteChoice(G, source, ability) &&
            abilityStacksOtherMinion(ability)
                ? 1
                : 0;
        if (
            provided.length !== need &&
            provided.length !== need + siteExtra
        ) {
            return 'INVALID_MOVE';
        }
        const effectCandidates = getEffectDesignationCandidates(
            G,
            source,
            ability
        );
        const effectIds = provided.slice(0, need);
        const allLegal = effectIds.every((id) =>
            effectCandidates.some(
                (c) => c.instanceId === id || c.id === id
            )
        );
        if (!allLegal) return 'INVALID_MOVE';
    }
    if (abilityNeedsHandDiscard(ability) && !discardedHandIds?.length) {
        return 'INVALID_MOVE';
    }
    if (abilityNeedsSiteReplace(ability)) {
        const effect = abilityReplaceSiteEffect(ability);
        // Coût désigné (Mere…) : le site est en chosenEffectTargetId, pas le coût.
        const ids = normalizeChosenIds(
            needsCostDesignation
                ? chosenEffectTargetId
                : (chosenEffectTargetId ?? chosenTargetId)
        );
        if (
            effect?.scope === 'REGION' ||
            effect?.scope === 'OPPONENT'
        ) {
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
    if (
        abilityNeedsStackSiteChoice(G, source, ability) &&
        !abilityStacksOtherMinion(ability)
    ) {
        const ids = normalizeChosenIds(
            needsCostDesignation
                ? chosenEffectTargetId
                : (chosenEffectTargetId ?? chosenTargetId)
        );
        if (ids.length < 1) return 'INVALID_MOVE';
    }
    const wasResponseWindowOpen = isResponseWindowOpen(G);
    const isResponseAbility = abilityMatchesPhase(ability, 'RESPONSE');
    const chooseOne = (ability.effects || []).find(
        (effect) => effect.type === 'CHOOSE_ONE'
    );
    const delayCostUntilChoice =
        chooseOne?.type === 'CHOOSE_ONE' &&
        (!chooseOne.chooser || chooseOne.chooser === 'OWNER');

    if (delayCostUntilChoice) {
        if (!canPayAbilityCost(G, source, ability.cost, actorId)) {
            return 'INVALID_MOVE';
        }
    } else if (
        !payAbilityCost(
            G,
            source,
            ability.cost,
            // Coût auto (nom propre unique) : l’arg 3 peut quand même être
            // fourni comme indice ; la cible d’effet reste en 5ᵉ arg.
            chosenTargetId,
            discardedHandIds,
            needsCostDesignation
                ? chosenEffectTargetId
                : (chosenEffectTargetId ?? chosenTargetId),
            actorId
        )
    ) {
        return 'INVALID_MOVE';
    } else {
        // Coût payé = capacité engagée (limite par phase).
        recordAbilityUseThisPhase(G, source, ability);
    }
    // Si le 5ᵉ arg est présent, c’est la cible d’effet — même quand le coût
    // nom propre a été résolu sans désignation (Mere : site en 5ᵉ).
    const effectTargetId = needsCostDesignation
        ? chosenEffectTargetId
        : (chosenEffectTargetId ?? chosenTargetId);
    const costIdForEffect = needsCostDesignation
        ? chosenTargetId
        : chosenEffectTargetId
          ? chosenTargetId
          : undefined;

    // Capacité spéciale : coût payé → fenêtre « about to use » si réponse.
    if (
        !wasResponseWindowOpen &&
        !isResponseAbility &&
        !delayCostUntilChoice &&
        requestAboutToUseAbility(
            G,
            source,
            ability,
            actorId,
            effectTargetId,
            discardedHandIds,
            costIdForEffect
        )
    ) {
        pauseActionYieldForResponses(G, actorId);
        return;
    }

    if (
        !applyAbilityEffect(
            G,
            source,
            ability,
            effectTargetId,
            discardedHandIds,
            costIdForEffect,
            String(playerID)
        )
    ) {
        return 'INVALID_MOVE';
    }

    if (ability.omitFromArcheryTotal) {
        source.omitFromArcheryTotal = true;
    }

    if (wasResponseWindowOpen && isResponseAbility) {
        appendAbilityUsedJournal(G, source, ability, effectTargetId);
        afterResponseResolved(G, String(playerID), ability, source);
        flushPendingPhaseAfterResponse(G, events);
        return;
    }

    if (isResponseWindowOpen(G) && !wasResponseWindowOpen) {
        appendAbilityUsedJournal(G, source, ability, effectTargetId);
        pauseActionYieldForResponses(G, String(playerID));
        return;
    }

    // Porter l’Anneau hors d’une fenêtre déjà ouverte (ex. Combat : fardeau).
    if (tryOpenPutsOnTheOneRing(G) === 'WAITING') {
        appendAbilityUsedJournal(G, source, ability, effectTargetId);
        pauseActionYieldForResponses(G, String(playerID));
        return;
    }

    if (G.pendingForcedChoice) {
        G.pendingForcedChoice.actingPlayerId = String(playerID);
        if (delayCostUntilChoice) {
            G.pendingForcedChoice.cancelable = true;
            G.pendingForcedChoice.unpaidCost = ability.cost;
            G.pendingForcedChoice.costChosenTargetId = chosenTargetId;
            G.pendingForcedChoice.costDiscardedHandIds = discardedHandIds;
        }
        return;
    }

    yieldPriorityAfterAction(G, String(playerID));
    appendAbilityUsedJournal(G, source, ability, effectTargetId);
    const title = source.i18n?.fr?.title || source.title || source.id;
    G.statusMessage = `${title} active une capacité.`;

    // Site début de fellowship : après résolution, dual-wait ou suite de phase.
    if (
        G.pendingSiteStartAbility &&
        G.pendingSiteStartAbility.abilityId === ability.id
    ) {
        afterSiteStartAbilityResolved(G, events);
    }

    syncStartOfPhaseAfterAbility(G, ctx, events, String(playerID));
};

export const abilityMoves = {
    activateAbility,
};
