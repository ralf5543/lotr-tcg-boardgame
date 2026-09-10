import type { LotrMoveContext, CardState, GameState } from '../types';
import { getEffectiveVitality } from '../../utils/cardStats';
import { requestWounds } from '../engine/responseWindow';

function livingCompanions(G: GameState, fpId: string): CardState[] {
    const fpPlayer = G.players[fpId];
    return (fpPlayer?.fellowshipArea || []).filter(
        (c: CardState) => !c.isDead && getEffectiveVitality(c) > 0
    );
}

function livingMinions(G: GameState): CardState[] {
    return (G.battlefield || []).filter(
        (c: CardState) =>
            c.kind === 'SHADOW' &&
            c.type === 'MINION' &&
            !c.isDead &&
            getEffectiveVitality(c) > 0
    );
}

function responsePending(G: GameState): boolean {
    return Boolean(G.responseWindow?.isOpen || G.pendingEvent);
}

function pauseArcheryForResponses(
    G: GameState,
    next: NonNullable<GameState['archeryAfterResponses']>
): void {
    G.archeryAfterResponses = next;
}

function beginShadowArcheryAssign(G: GameState): void {
    const shadowWoundsToAssign = G.archeryState?.fpTotal ?? 0;
    G.archeryAssignStep = 'SHADOW';
    G.archeryWoundsToAssign = shadowWoundsToAssign;
    if (G.archeryState) {
        G.archeryState.step = 'SHADOW_ASSIGN';
        G.archeryState.shadowRemainingWounds = shadowWoundsToAssign;
        G.archeryState.fpRemainingWounds = 0;
    }
    G.statusMessage = 'Passage à l’assignation des blessures d’Ombre.';
}

function endArcheryPhase(G: GameState, noMinionsLeft: boolean): void {
    G.archeryAssignStep = undefined;
    if (G.archeryState) G.archeryState.step = 'COMPLETE';
    G.pendingPhaseEnd = true;
    G.nextPhase = noMinionsLeft ? 'regroup' : 'assignment';
    G.statusMessage = noMinionsLeft
        ? 'Plus aucun séide sur le plateau ! Passage au Regroupement.'
        : 'Phase d’Archerie terminée. Passage à l’Assignation.';
}

export const assignArcheryWound = (
    { G, playerID }: LotrMoveContext,
    targetCardId: string
) => {
    if (responsePending(G)) return 'INVALID_MOVE';

    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';

    const assignStep = G.archeryAssignStep || G.archeryState?.step;
    if (!assignStep) return 'INVALID_MOVE';

    if (assignStep === 'FP' || assignStep === 'FP_ASSIGN') {
        if (playerID !== fpId) return 'INVALID_MOVE';

        const fpPlayer = G.players[fpId];
        const companion = fpPlayer?.fellowshipArea?.find(
            (c: CardState) =>
                c.id === targetCardId || c.instanceId === targetCardId
        );

        if (
            !companion ||
            companion.isDead ||
            getEffectiveVitality(companion) <= 0
        ) {
            return 'INVALID_MOVE';
        }
        requestWounds(G, companion, 1);

        if (G.archeryWoundsToAssign !== undefined) G.archeryWoundsToAssign -= 1;
        if (G.archeryState?.fpRemainingWounds !== undefined)
            G.archeryState.fpRemainingWounds -= 1;

        const remainingWounds =
            G.archeryState?.fpRemainingWounds ?? G.archeryWoundsToAssign ?? 0;
        const remainingCompanions = livingCompanions(G, fpId);

        if (remainingWounds <= 0 || remainingCompanions.length === 0) {
            const shadowWoundsToAssign = G.archeryState?.fpTotal ?? 0;
            const minions = livingMinions(G);
            const goToShadow =
                shadowWoundsToAssign > 0 && minions.length > 0;

            if (responsePending(G)) {
                pauseArcheryForResponses(
                    G,
                    goToShadow ? 'SHADOW_ASSIGN' : 'END'
                );
            } else if (goToShadow) {
                beginShadowArcheryAssign(G);
            } else {
                endArcheryPhase(G, minions.length === 0);
            }
        } else {
            G.statusMessage = `Assignation d'archerie FP : ${remainingWounds} restante(s).`;
        }
        return;
    }

    if (assignStep === 'SHADOW' || assignStep === 'SHADOW_ASSIGN') {
        if (playerID !== shadowId) return 'INVALID_MOVE';

        const minion = (G.battlefield || []).find(
            (c: CardState) =>
                c.id === targetCardId || c.instanceId === targetCardId
        );

        if (!minion || minion.isDead || getEffectiveVitality(minion) <= 0) {
            return 'INVALID_MOVE';
        }
        requestWounds(G, minion, 1);

        if (G.archeryWoundsToAssign !== undefined) G.archeryWoundsToAssign -= 1;
        if (G.archeryState?.shadowRemainingWounds !== undefined)
            G.archeryState.shadowRemainingWounds -= 1;

        const remainingWounds =
            G.archeryState?.shadowRemainingWounds ??
            G.archeryWoundsToAssign ??
            0;
        const remaining = livingMinions(G);

        if (remainingWounds <= 0 || remaining.length === 0) {
            if (responsePending(G)) {
                pauseArcheryForResponses(G, 'END');
            } else {
                endArcheryPhase(G, remaining.length === 0);
                if (remaining.length === 0) {
                    G.statusMessage =
                        'Tous les séides ont été éliminés ! Passage au Regroupement.';
                }
            }
        } else {
            G.statusMessage = `Ombre : Assignez encore ${remainingWounds} blessure(s).`;
        }
    }
};

export const archeryMoves = {
    assignArcheryWound,
};
