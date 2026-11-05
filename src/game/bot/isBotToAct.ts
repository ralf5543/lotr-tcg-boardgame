import type { Ctx } from 'boardgame.io';
import type { GameState } from '../types';

export function fpPlayerId(G: GameState): string {
    return G.fpPlayerId || '0';
}

export function shadowPlayerId(G: GameState): string {
    return fpPlayerId(G) === '0' ? '1' : '0';
}

/**
 * Joueur nommé par un pending / fenêtre ouverte.
 * S’il y en a un, seul ce joueur peut agir.
 */
export function pendingNamedActor(G: GameState): string | null {
    const id = (v: unknown): string | null =>
        v === undefined || v === null ? null : String(v);

    if (G.pendingForcedChoice) return id(G.pendingForcedChoice.playerId);
    if (G.pendingWhenPlayed) return id(G.pendingWhenPlayed.playerId);
    if (G.pendingSiteStartAbility)
        return id(G.pendingSiteStartAbility.playerId);
    if (G.pendingSiteMoveAbility) return id(G.pendingSiteMoveAbility.playerId);
    if (G.pendingSitePhaseAbility)
        return id(G.pendingSitePhaseAbility.playerId);
    if (G.pendingSitePhaseDesignation)
        return id(G.pendingSitePhaseDesignation.playerId);
    if (G.pendingSiteFollowerTransfer)
        return id(G.pendingSiteFollowerTransfer.playerId);
    if (G.pendingFpDiscard) return id(G.pendingFpDiscard.playerId);
    if (G.pendingDeadPileRemoval) return id(G.pendingDeadPileRemoval.playerId);
    if (G.pendingSiteCharacterWounds)
        return id(G.pendingSiteCharacterWounds.playerId);
    if (G.responseWindow?.isOpen && G.responseWindow.activePlayerId) {
        return id(G.responseWindow.activePlayerId);
    }
    if (G.actionWindow?.isOpen && G.actionWindow.activePlayerId) {
        return id(G.actionWindow.activePlayerId);
    }
    return null;
}

function nextSiteOwner(G: GameState): string | null {
    if (!G.awaitingSiteSelection) return null;
    const nextEmpty = G.path.findIndex((slot) => slot === null);
    if (nextEmpty < 0) return null;
    return nextEmpty === 0 ? fpPlayerId(G) : shadowPlayerId(G);
}

/**
 * Le BOT doit-il jouer maintenant ? (tour logique métier, pas seulement ctx.currentPlayer)
 */
export function isBotToAct(
    G: GameState,
    ctx: Ctx,
    playerID: string
): boolean {
    if (G.gameResult) return false;

    const named = pendingNamedActor(G);
    if (named != null) return named === playerID;

    const phase = ctx.phase || '';
    const fp = fpPlayerId(G);
    const shadow = shadowPlayerId(G);

    if (phase === 'setup' && G.setupState) {
        const step = G.setupState.step;
        if (step === 'BIDDING') {
            const bid = G.setupState.bids?.[playerID];
            return bid === null || bid === undefined;
        }
        if (step === 'CHOOSING_FIRST') {
            return G.setupState.auctionWinnerId === playerID;
        }
        if (step === 'AWAITING_SITE') {
            return fp === playerID;
        }
        if (step === 'MULLIGAN') {
            const m = G.setupState.mulligans?.[playerID];
            return m === null || m === undefined;
        }
    }

    const siteOwner = nextSiteOwner(G);
    if (siteOwner != null) return siteOwner === playerID;

    if ((G.threatWoundsToAssign ?? 0) > 0) {
        return playerID === fp;
    }

    if (G.sanctuaryHeal) {
        return playerID === fp;
    }

    // Ne lire assignment / archery que dans leur phase : l’état initial
    // garde assignmentStep='FP_ASSIGN' jusqu’à la 1ʳᵉ phase d’assignation.
    if (phase === 'archery') {
        const archeryStep = G.archeryAssignStep || G.archeryState?.step;
        if (archeryStep === 'FP' || archeryStep === 'FP_ASSIGN') {
            return playerID === fp;
        }
        if (archeryStep === 'SHADOW' || archeryStep === 'SHADOW_ASSIGN') {
            return playerID === shadow;
        }
        return false;
    }

    if (phase === 'assignment') {
        if (G.assignmentStep === 'FP_ASSIGN') return playerID === fp;
        if (G.assignmentStep === 'SHADOW_ASSIGN') return playerID === shadow;
        // ACTIONS / COMPLETED : fenêtres via pendingNamedActor, sinon rien.
        return false;
    }

    if (phase === 'shadow') return playerID === shadow;
    if (phase === 'fellowship') return playerID === fp;
    if (phase === 'skirmish') return playerID === fp;

    if (phase === 'regroup') {
        if (G.regroupStep === 'SHADOW_REFILL') return playerID === shadow;
        if (G.regroupStep === 'FP_REFILL') return playerID === fp;
        if (G.regroupStep === 'FP_DECISION') return playerID === fp;
    }

    if (
        phase.startsWith('startOf') &&
        G.startOfPhaseState?.players?.[playerID] &&
        !G.startOfPhaseState.players[playerID].isDone
    ) {
        return true;
    }

    if (phase === 'maneuver') {
        // Fenêtres déjà couvertes par pendingNamedActor ; sinon rien à faire.
        return false;
    }

    return false;
}
