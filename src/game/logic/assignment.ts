import type { Ctx } from 'boardgame.io';
import type { GameState, CardState } from '../types';

export const getUnassignedMinions = (G: GameState): CardState[] => {
    const assignedMinionIds = (G.skirmishes || []).flatMap((s) => s.minionIds);
    return (G.battlefield || []).filter(
        (c: any) =>
            c.kind === 'SHADOW' &&
            !assignedMinionIds.includes(c.instanceId || c.id)
    );
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
        const allCompanionsHaveMinion = companions.every((comp: any) =>
            G.skirmishes.some(
                (s) =>
                    (s.companionId === comp.id || s.companionId === comp.instanceId) &&
                    s.minionIds.length > 0
            )
        );

        if (allCompanionsHaveMinion) {
            G.assignmentStep = 'SHADOW_ASSIGN';
            G.statusMessage =
                "Surcharge ! L'Ombre affecte les séides restants à son choix.";
            events?.setActivePlayers?.({ value: { [shadowId]: 'play' } });
        }
    }
};