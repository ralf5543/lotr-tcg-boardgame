import type {
    Ability,
    CardState,
    GameState,
    PendingEvent,
} from '../types';
import { applyWoundAndCheckDeath } from '../../utils/applyWoundAndCheckDeath';
import { findTargetCard, isRingBearerCard } from '../../utils/cardUtils';
import { clearActionableFlags } from '../../utils/clearActionableFlags';
import { canPayAbilityCost } from './abilities/payAbilityCost';
import { findBearer, forEachInPlayCard } from './abilities/resolveCostTarget';
import { cardMatchesTarget } from './validations/matchers';
import { abilityMatchesPhase } from './abilities/collectAbilities';
import { getEffectiveVitality } from '../../utils/cardStats';
import { yieldPriorityAfterAction } from './actionWindow';

const matchCard = (card: CardState, targetId: string): boolean =>
    card.instanceId === targetId || card.id === targetId;

export function isResponseWindowOpen(G: GameState): boolean {
    return Boolean(G.responseWindow?.isOpen);
}

export function canActInResponseWindow(
    G: GameState,
    playerID: string
): boolean {
    if (!G.responseWindow?.isOpen) return true;
    return G.responseWindow.activePlayerId === playerID;
}

export function abilityMatchesTrigger(
    ability: Ability,
    event: PendingEvent | undefined,
    source: CardState,
    G: GameState
): boolean {
    if (!ability.trigger || !event) return false;
    if (ability.trigger.type !== event.type) return false;

    if (event.type !== 'ABOUT_TO_WOUND') return false;
    if (ability.trigger.inSkirmish && !isInSkirmish(G)) return false;

    const wounded = findTargetCard(G, event.targetId) as CardState | null;
    if (!wounded) return false;

    const target = ability.trigger.target;
    if (target === 'SELF') return matchCard(wounded, source.instanceId || source.id);
    if (target === 'BEARER') {
        const bearer = findBearer(G, source);
        return Boolean(
            bearer && matchCard(bearer, event.targetId)
        );
    }
    if (Array.isArray(target)) return cardMatchesTarget(wounded, target);
    return false;
}

function isResponseAbility(ability: Ability): boolean {
    return abilityMatchesPhase(ability, 'RESPONSE');
}

function otherPlayerId(playerID: string): string {
    return playerID === '0' ? '1' : '0';
}

function cardOwnerId(G: GameState, card: CardState): string | null {
    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';
    if (card.kind === 'FREE_PEOPLE') return fpId;
    if (card.kind === 'SHADOW') return shadowId;
    return null;
}

function isInSkirmish(G: GameState): boolean {
    return Boolean(G.activeSkirmishId);
}

function abilityWearsTheOneRing(ability: Ability): boolean {
    return (ability.effects || []).some((effect) => effect.type === 'WEAR_RING');
}

function pendingWoundIsRingBearer(G: GameState): boolean {
    const event = G.pendingEvent;
    if (!event || event.type !== 'ABOUT_TO_WOUND') return false;
    const card = findTargetCard(G, event.targetId) as CardState | null;
    return Boolean(card && isRingBearerCard(card));
}

function responseWoundMessage(G: GameState): string {
    if (G.wearingTheOneRing && pendingWoundIsRingBearer(G)) {
        return 'L’Anneau Unique est porté. Jouez une autre réponse ou passez (fardeaux à la place).';
    }
    return 'Une carte est sur le point d’être blessée. Jouez une réponse ou passez.';
}

function shouldReplaceWoundWithBurdens(
    G: GameState,
    card: CardState
): boolean {
    const wearing = G.wearingTheOneRing;
    if (!wearing || card.isDead || !isRingBearerCard(card)) return false;
    if (wearing.onlyInSkirmish && !isInSkirmish(G)) return false;
    return true;
}

function addFpBurdens(G: GameState, count: number): void {
    const fpId = G.fpPlayerId || '0';
    const player = G.players[fpId];
    if (!player || count <= 0) return;
    player.burdens = (player.burdens || 0) + count;
}

function applyWoundOrRingReplacement(
    G: GameState,
    card: CardState,
    count: number
): void {
    if (shouldReplaceWoundWithBurdens(G, card)) {
        const each = G.wearingTheOneRing!.replaceWoundWithBurdens;
        const total = each * count;
        addFpBurdens(G, total);
        const name =
            card.i18n?.fr?.title || card.title || 'Le Porteur de l’Anneau';
        G.statusMessage = `${name} porte l’Anneau Unique : ${total} fardeau${total > 1 ? 's' : ''} à la place.`;
        return;
    }
    applyWoundAndCheckDeath(G, card, count);
}

function inPlayResponseIsLegal(
    G: GameState,
    source: CardState,
    ability: Ability
): boolean {
    if (!isResponseAbility(ability)) return false;
    const event = G.pendingEvent;
    if (!event || event.type !== 'ABOUT_TO_WOUND' || event.remaining <= 0) {
        return false;
    }
    if (abilityWearsTheOneRing(ability) && G.wearingTheOneRing) return false;
    if (!abilityMatchesTrigger(ability, event, source, G)) return false;
    return canPayAbilityCost(G, source, ability.cost);
}

function twilightPayableForEvent(
    G: GameState,
    card: CardState,
    playerID: string
): boolean {
    const fpId = G.fpPlayerId || '0';
    if (playerID === fpId || card.kind !== 'SHADOW') return true;
    const cost = card.twilightCost || 0;
    return (G.twilightPool || 0) >= cost;
}

function handResponseIsLegal(
    G: GameState,
    card: CardState,
    playerID: string
): boolean {
    if (card.type !== 'EVENT' || card.kind === 'NONE') return false;
    const event = G.pendingEvent;
    if (!event || event.type !== 'ABOUT_TO_WOUND' || event.remaining <= 0) {
        return false;
    }
    const owner = cardOwnerId(G, card);
    if (owner !== playerID) return false;
    const ability = (card.abilities || []).find(isResponseAbility);
    if (!ability) return false;
    if (!abilityMatchesTrigger(ability, event, card, G)) return false;
    if (!twilightPayableForEvent(G, card, playerID)) return false;
    return canPayAbilityCost(G, card, ability.cost);
}

export function playerHasEligibleResponse(
    G: GameState,
    playerID: string
): boolean {
    if (!G.pendingEvent) return false;

    const player = G.players[playerID];
    if (player?.hand?.some((card) => card && handResponseIsLegal(G, card, playerID))) {
        return true;
    }

    let found = false;
    forEachInPlayCard(G, (card) => {
        if (found) return;
        if (cardOwnerId(G, card) !== playerID) return;
        const legal = (card.abilities || []).some((ability) =>
            inPlayResponseIsLegal(G, card, ability)
        );
        if (legal) found = true;
    });
    return found;
}

function hasAnyEligibleResponse(G: GameState): boolean {
    return Object.keys(G.players || {}).some((id) =>
        playerHasEligibleResponse(G, id)
    );
}

function openResponseWindow(G: GameState): void {
    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';
    const activePlayerId = playerHasEligibleResponse(G, fpId)
        ? fpId
        : shadowId;

    G.responseWindow = {
        isOpen: true,
        activePlayerId,
        title: 'RÉPONSE',
        message: responseWoundMessage(G),
        canPass: true,
        passesCount: 0,
    };
    G.statusMessage =
        'Réponse : jouez une réponse ou passez.';
    clearActionableFlags(G);
}

export function closeResponseWindow(G: GameState): void {
    G.responseWindow = undefined;
    clearActionableFlags(G);
}

function processWoundQueue(G: GameState): 'APPLIED' | 'WAITING' {
    while (G.woundQueue && G.woundQueue.length > 0) {
        const next = G.woundQueue.shift()!;
        const card = findTargetCard(G, next.targetId) as CardState | null;
        if (!card || card.isDead || next.count <= 0) continue;

        G.pendingEvent = {
            type: 'ABOUT_TO_WOUND',
            targetId: next.targetId,
            remaining: next.count,
        };

        if (!hasAnyEligibleResponse(G)) {
            applyWoundOrRingReplacement(G, card, next.count);
            G.pendingEvent = undefined;
            continue;
        }

        openResponseWindow(G);
        return 'WAITING';
    }

    G.woundQueue = undefined;
    G.pendingEvent = undefined;
    closeResponseWindow(G);
    tryResumeArcheryAfterResponses(G);
    flushPendingActionYield(G);
    return 'APPLIED';
}

export function continueAfterCurrentWound(
    G: GameState
): 'APPLIED' | 'WAITING' {
    const event = G.pendingEvent;
    if (!event || event.type !== 'ABOUT_TO_WOUND' || event.remaining <= 0) {
        G.pendingEvent = undefined;
        closeResponseWindow(G);
        return processWoundQueue(G);
    }

    const card = findTargetCard(G, event.targetId) as CardState | null;
    if (!card || card.isDead) {
        G.pendingEvent = undefined;
        closeResponseWindow(G);
        return processWoundQueue(G);
    }

    if (hasAnyEligibleResponse(G)) {
        openResponseWindow(G);
        return 'WAITING';
    }

    applyWoundOrRingReplacement(G, card, event.remaining);
    G.pendingEvent = undefined;
    closeResponseWindow(G);
    return processWoundQueue(G);
}

function applyOnePendingWound(G: GameState): void {
    const event = G.pendingEvent;
    if (!event || event.type !== 'ABOUT_TO_WOUND' || event.remaining <= 0) {
        return;
    }
    const card = findTargetCard(G, event.targetId) as CardState | null;
    if (card && !card.isDead) {
        applyWoundOrRingReplacement(G, card, 1);
    }
    event.remaining -= 1;
}

export function requestWounds(
    G: GameState,
    card: CardState,
    count = 1
): 'APPLIED' | 'WAITING' {
    if (!card || count <= 0) return 'APPLIED';

    const item = { targetId: card.instanceId || card.id, count };
    if (!G.woundQueue) G.woundQueue = [];

    const busy = Boolean(G.pendingEvent || G.responseWindow?.isOpen);
    G.woundQueue.push(item);
    if (busy) return 'WAITING';
    return processWoundQueue(G);
}

export function passResponseWindow(
    G: GameState,
    playerID: string
): 'APPLIED' | 'WAITING' | 'INVALID' {
    if (!G.responseWindow?.isOpen) return 'INVALID';
    if (G.responseWindow.activePlayerId !== playerID) return 'INVALID';

    const other = otherPlayerId(playerID);
    if (!playerHasEligibleResponse(G, other)) {
        applyOnePendingWound(G);
        return continueAfterCurrentWound(G);
    }

    const currentPasses = (G.responseWindow.passesCount || 0) + 1;
    if (currentPasses >= 2) {
        applyOnePendingWound(G);
        return continueAfterCurrentWound(G);
    }

    const fpId = G.fpPlayerId || '0';
    G.responseWindow = {
        ...G.responseWindow,
        activePlayerId: other,
        passesCount: currentPasses,
        message: `Au tour du joueur ${other === fpId ? 'FP' : 'Ombre'} de répondre ou de passer.`,
    };
    clearActionableFlags(G);
    return 'WAITING';
}

export function yieldResponsePriorityAfterAction(
    G: GameState,
    playerID: string
): void {
    if (!G.responseWindow?.isOpen) return;
    if (G.responseWindow.activePlayerId !== playerID) return;

    const other = otherPlayerId(playerID);
    const fpId = G.fpPlayerId || '0';

    if (playerHasEligibleResponse(G, other)) {
        G.responseWindow = {
            ...G.responseWindow,
            activePlayerId: other,
            passesCount: 0,
            message: `Au tour du joueur ${other === fpId ? 'FP' : 'Ombre'} de répondre ou de passer.`,
        };
        clearActionableFlags(G);
        return;
    }

    if (playerHasEligibleResponse(G, playerID)) {
        G.responseWindow = {
            ...G.responseWindow,
            activePlayerId: playerID,
            passesCount: 1,
            message: responseWoundMessage(G),
        };
        G.statusMessage =
            'Réponse : vous pouvez enchaîner ou passer.';
        clearActionableFlags(G);
        return;
    }

    resolvePendingResponse(G);
}

function resolvePendingResponse(G: GameState): void {
    const event = G.pendingEvent;
    if (!event || event.type !== 'ABOUT_TO_WOUND' || event.remaining <= 0) {
        G.pendingEvent = undefined;
        closeResponseWindow(G);
        processWoundQueue(G);
        return;
    }
    applyOnePendingWound(G);
    continueAfterCurrentWound(G);
}

export function afterResponseResolved(
    G: GameState,
    playerID: string,
    _ability: Ability
): void {
    if (!G.responseWindow?.isOpen) return;
    yieldResponsePriorityAfterAction(G, playerID);
}

export function flushPendingActionYield(G: GameState): void {
    const playerID = G.pendingActionYieldPlayerId;
    G.pendingActionYieldPlayerId = undefined;
    if (!playerID) return;
    yieldPriorityAfterAction(G, playerID);
}

export function pauseActionYieldForResponses(
    G: GameState,
    playerID: string
): void {
    G.pendingActionYieldPlayerId = playerID;
}

function livingBattlefieldMinions(G: GameState): CardState[] {
    return (G.battlefield || []).filter(
        (card) =>
            card.kind === 'SHADOW' &&
            card.type === 'MINION' &&
            !card.isDead &&
            getEffectiveVitality(card) > 0
    );
}

function startShadowArcheryAssign(G: GameState): boolean {
    const shadowWoundsToAssign = G.archeryState?.fpTotal ?? 0;
    const livingMinions = livingBattlefieldMinions(G);
    if (shadowWoundsToAssign <= 0 || livingMinions.length === 0) {
        return false;
    }

    G.archeryAssignStep = 'SHADOW';
    G.archeryWoundsToAssign = shadowWoundsToAssign;
    if (G.archeryState) {
        G.archeryState.step = 'SHADOW_ASSIGN';
        G.archeryState.shadowRemainingWounds = shadowWoundsToAssign;
        G.archeryState.fpRemainingWounds = 0;
    }
    G.statusMessage = 'Passage à l’assignation des blessures d’Ombre.';
    return true;
}

function concludeArcheryPhase(G: GameState): void {
    G.archeryAssignStep = undefined;
    if (G.archeryState) G.archeryState.step = 'COMPLETE';

    const livingMinions = livingBattlefieldMinions(G);
    G.pendingPhaseEnd = true;
    G.nextPhase = livingMinions.length === 0 ? 'regroup' : 'assignment';
    G.statusMessage =
        livingMinions.length === 0
            ? 'Plus aucun séide sur le plateau ! Passage au Regroupement.'
            : 'Phase d’Archerie terminée. Passage à l’Assignation.';
}

function tryResumeArcheryAfterResponses(G: GameState): void {
    if (!G.archeryAfterResponses) return;
    if (G.responseWindow?.isOpen || G.pendingEvent) return;

    const next = G.archeryAfterResponses;
    G.archeryAfterResponses = undefined;

    if (next === 'SHADOW_ASSIGN' && startShadowArcheryAssign(G)) {
        return;
    }
    concludeArcheryPhase(G);
}
