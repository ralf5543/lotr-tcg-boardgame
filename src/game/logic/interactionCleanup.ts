import type { GameState } from '../types';
import { cancelForcedChoice } from '../engine/abilities/startOfSkirmish';
import { declinePendingWhenPlayed } from '../engine/abilities/whenPlayed';
import { declinePendingSiteStartAbility } from './siteStartAbility';
import { resolvePendingSiteMoveAbility } from './siteMoveAbility';
import { resolvePendingSitePhaseAbility } from './sitePhaseAbility';
import { clearActionableFlags } from '../../utils/clearActionableFlags';

type PhaseEvents = { setPhase?: (phase: string) => void };

/**
 * Obligation non contournable (choix forcé sans Annuler) : bloque le reste.
 * Les prompts optionnels sont plutôt « auto-passés » via
 * `dismissOwnOptionalPromptsAsPass`.
 */
export function mandatoryPromptBlocksActor(
    G: GameState,
    playerID: string
): string | null {
    const pid = String(playerID);
    const forced = G.pendingForcedChoice;
    if (forced && !forced.cancelable && String(forced.playerId) === pid) {
        return 'Résolvez d’abord le choix en cours.';
    }
    return null;
}

/**
 * Toasters / prompts optionnels « à soi » : les traiter comme Passer / Annuler
 * quand le joueur agit ailleurs (autre carte, autre capacité).
 *
 * Ne touche pas aux obligations (réponse formelle, choix forcé non annulable,
 * blessures à assigner…).
 */
export function dismissOwnOptionalPromptsAsPass(
    G: GameState,
    playerID: string,
    events?: PhaseEvents
): void {
    const pid = String(playerID);

    if (G.pendingPlay?.playerId === pid) {
        G.pendingPlay = undefined;
    }

    if (G.pendingWhenPlayed?.playerId === pid) {
        declinePendingWhenPlayed(G, pid);
    }

    if (G.pendingSiteStartAbility?.playerId === pid) {
        declinePendingSiteStartAbility(G, pid, events);
    }

    if (G.pendingSiteMoveAbility?.playerId === pid) {
        resolvePendingSiteMoveAbility(G, pid, false, events);
    }

    if (G.pendingSitePhaseAbility?.playerId === pid) {
        resolvePendingSitePhaseAbility(G, pid, false);
    }

    if (
        G.pendingForcedChoice?.cancelable &&
        G.pendingForcedChoice.playerId === pid
    ) {
        cancelForcedChoice(G, pid);
    }
}

/**
 * Entrée de phase (startOf* ou phase jouable) : coupe les restes d’interaction
 * de la phase précédente. Chaque onBegin rouvre ce dont il a besoin (AW, dual-wait…).
 *
 * Ne vide pas une fenêtre de réponse / file de blessures encore vivante
 * (fin de phase normalement bloquée tant qu’elles tournent).
 */
export function clearStaleInteractionOnPhaseEntry(G: GameState): void {
    G.actionWindow = undefined;
    G.pendingPlay = undefined;
    G.pendingWhenPlayed = undefined;
    G.pendingYouPlayQueue = undefined;
    G.pendingSiteStartAbility = undefined;
    G.pendingSiteMoveAbility = undefined;
    G.pendingSitePhaseAbility = undefined;
    G.pendingSitePhaseDesignation = undefined;
    G.pendingSiteFollowerTransfer = undefined;
    G.pendingFpDiscard = undefined;
    G.pendingSiteDepartureContinuation = undefined;
    G.pendingReveal = undefined;
    // Choix forcé d’une phase précédente (ne devrait plus être là).
    if (G.pendingForcedChoice) {
        G.pendingForcedChoice = undefined;
    }
    clearActionableFlags(G);
}
