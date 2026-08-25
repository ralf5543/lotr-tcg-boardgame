import type { Ctx } from 'boardgame.io';
import type { GameState, CardState } from '../types';
import { getKeywordValue } from '../engine/keywords/keywordUtils';

export const getUnassignedMinions = (G: GameState): CardState[] => {
    const assignedMinionIds = (G.skirmishes || []).flatMap((s) => s.minionIds);
    return (G.battlefield || []).filter(
        (c: any) =>
            c.kind === 'SHADOW' &&
            !assignedMinionIds.includes(c.instanceId || c.id)
    );
};

/**
 * Calcule la capacité maximale d'assignation d'un compagnon durant FP_ASSIGN
 * Capacité de base = 1
 * Si DEFENDER +X = 1 + X
 */
export const getCompanionDefenderCapacity = (
    companion: CardState,
    G: GameState
): number => {
    const defenderBonus = getKeywordValue(companion, 'DEFENDER');
    const extraDefender = defenderBonus > 0 ? defenderBonus : 0;
    return 1 + extraDefender;
};

export const checkAssignmentProgress = (
    G: GameState,
    _ctx: Ctx,
    events?: { 
        endPhase?: () => void; 
        endTurn?: () => void;
        setActivePlayers?: (arg: { value: Record<string, string> }) => void;
    }
) => {
    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';

    const unassignedMinions = getUnassignedMinions(G);
    const companions = G.players[fpId]?.fellowshipArea || [];

    if (unassignedMinions.length === 0) {
        G.assignmentStep = 'COMPLETED';
        G.statusMessage =
            'Toutes les affectations sont terminées. Début des combats !';
        events?.endPhase?.();
        return;
    }

    if (G.assignmentStep === 'FP_ASSIGN') {

        const allCompanionsFull = companions.every((comp: any) => {
            const compId = comp.instanceId || comp.id;
            
            // Cherche le combat associé à ce compagnon
            const skirmish = G.skirmishes.find(
                (s) => s.companionId === comp.id || s.companionId === comp.instanceId
            );
            const assignedCount = skirmish ? skirmish.minionIds.length : 0;
            
            // Capacité dynamique (1 + DEFENDER)
            const maxCapacity = getCompanionDefenderCapacity(comp, G);
            const isFull = assignedCount >= maxCapacity;

            return isFull;
        });

        if (allCompanionsFull) {
            G.assignmentStep = 'SHADOW_ASSIGN';
            G.statusMessage =
                "Surcharge ! L'Ombre affecte les séides restants à son choix.";
            events?.setActivePlayers?.({ value: { [shadowId]: 'play' } });
        }
    }
};