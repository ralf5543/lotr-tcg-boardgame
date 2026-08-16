import type { LotrMoveContext, CardState } from '../types';
import { applyWoundAndCheckDeath } from '../../utils/applyWoundAndCheckDeath';
import { getEffectiveVitality } from '../../utils/cardStats';
import { audioService } from '../../services/audioService';

export const assignArcheryWound = (
    { G, playerID }: LotrMoveContext,
    targetCardId: string
) => {
    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';

    const assignStep = G.archeryAssignStep || G.archeryState?.step;
    if (!assignStep) return 'INVALID_MOVE';

    const getLivingCompanions = () => {
        const fpPlayer = G.players[fpId];
        return (fpPlayer?.fellowshipArea || []).filter(
            (c: CardState) => !c.isDead && getEffectiveVitality(c) > 0
        );
    };

    const getLivingMinions = () => {
        return (G.battlefield || []).filter(
            (c: CardState) => !c.isDead && getEffectiveVitality(c) > 0
        );
    };

    // --- 1. ASSIGNATION FP ---
    if (assignStep === 'FP' || assignStep === 'FP_ASSIGN') {
        if (playerID !== fpId) return 'INVALID_MOVE';

        const fpPlayer = G.players[fpId];
        const companion = fpPlayer?.fellowshipArea?.find(
            (c: CardState) => c.id === targetCardId || c.instanceId === targetCardId
        );

        if (!companion || companion.isDead || getEffectiveVitality(companion) <= 0) {
            return 'INVALID_MOVE';
        }
        audioService.play('ARROW_IMPACT');
        applyWoundAndCheckDeath(G, companion, 1);

        if (G.archeryWoundsToAssign !== undefined) G.archeryWoundsToAssign -= 1;
        if (G.archeryState?.fpRemainingWounds !== undefined)
            G.archeryState.fpRemainingWounds -= 1;

        const remainingWounds = G.archeryState?.fpRemainingWounds ?? G.archeryWoundsToAssign ?? 0;
        const remainingCompanions = getLivingCompanions();

        if (remainingWounds <= 0 || remainingCompanions.length === 0) {
            const shadowWoundsToAssign = G.archeryState?.fpTotal ?? 0;
            const livingMinions = getLivingMinions();

            if (shadowWoundsToAssign > 0 && livingMinions.length > 0) {
                G.archeryAssignStep = 'SHADOW';
                G.archeryWoundsToAssign = shadowWoundsToAssign;

                if (G.archeryState) {
                    G.archeryState.step = 'SHADOW_ASSIGN';
                    G.archeryState.shadowRemainingWounds = shadowWoundsToAssign;
                    G.archeryState.fpRemainingWounds = 0;
                }

                G.statusMessage = 'Passage à l’assignation des blessures d’Ombre.';
            } else {
                G.archeryAssignStep = undefined;
                if (G.archeryState) G.archeryState.step = 'COMPLETE';

                G.pendingPhaseEnd = true;
                G.nextPhase = livingMinions.length === 0 ? 'regroup' : 'assignment';
                G.statusMessage =
                    livingMinions.length === 0
                        ? 'Plus aucun séide sur le plateau ! Passage au Regroupement.'
                        : 'Phase d’Archerie terminée. Passage à l’Assignation.';
            }
        } else {
            G.statusMessage = `Assignation d'archerie FP : ${remainingWounds} restante(s).`;
        }
        return;
    }

    // --- 2. ASSIGNATION OMBRE ---
    if (assignStep === 'SHADOW' || assignStep === 'SHADOW_ASSIGN') {
        if (playerID !== shadowId) return 'INVALID_MOVE';

        const minion = (G.battlefield || []).find(
            (c: CardState) => c.id === targetCardId || c.instanceId === targetCardId
        );

        if (!minion || minion.isDead || getEffectiveVitality(minion) <= 0) {
            return 'INVALID_MOVE';
        }
        audioService.play('ARROW_IMPACT');
        applyWoundAndCheckDeath(G, minion, 1);

        if (G.archeryWoundsToAssign !== undefined) G.archeryWoundsToAssign -= 1;
        if (G.archeryState?.shadowRemainingWounds !== undefined)
            G.archeryState.shadowRemainingWounds -= 1;

        const remainingWounds = G.archeryState?.shadowRemainingWounds ?? G.archeryWoundsToAssign ?? 0;
        const remainingMinions = getLivingMinions();

        if (remainingWounds <= 0 || remainingMinions.length === 0) {
            G.archeryAssignStep = undefined;
            if (G.archeryState) G.archeryState.step = 'COMPLETE';

            G.pendingPhaseEnd = true;
            G.nextPhase = remainingMinions.length === 0 ? 'regroup' : 'assignment';
            G.statusMessage =
                remainingMinions.length === 0
                    ? 'Tous les séides ont été éliminés ! Passage au Regroupement.'
                    : 'Phase d’Archerie terminée. Passage à l’Assignation.';
        } else {
            G.statusMessage = `Ombre : Assignez encore ${remainingWounds} blessure(s).`;
        }
    }
};

export const archeryMoves = {
    assignArcheryWound,
};