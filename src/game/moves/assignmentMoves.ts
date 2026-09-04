import type { LotrMoveContext } from '../types';
import {
    beginShadowAssignment,
    checkAssignmentProgress,
    getCompanionDefenderCapacity,
    getUnassignedMinions,
} from '../logic/assignment';
import { getCardText } from '../../utils/i18n';

export const assignMinion = (
    { G, ctx, playerID, events }: LotrMoveContext,
    minionId: string,
    companionId: string
) => {
    const fpId = G.fpPlayerId || '0';
    const isFP = playerID === fpId;
    const isShadow = playerID !== fpId;

    if (G.assignmentStep === 'FP_ASSIGN' && !isFP) return 'INVALID_MOVE';
    if (G.assignmentStep === 'SHADOW_ASSIGN' && !isShadow) return 'INVALID_MOVE';

    // ⚔️ Sécurité : Vérifie que le séide est bien éligible pour CETTE passe d'assignation
    // (En passe Acharnée, seuls les séides FIERCE non encore assignés dans cette passe sont renvoyés)
    const availableMinions = getUnassignedMinions(G);
    const isMinionEligible = availableMinions.some(
        (m) => m.id === minionId || (m as any).instanceId === minionId
    );

    if (!isMinionEligible) {
        console.warn(
            `[ASSIGNMENT MOVE] Assignation refusée : le séide ${minionId} n'est pas disponible ou non-FIERCE en passe Acharnée (isFierceAssignment = ${G.isFierceAssignment}).`
        );
        return 'INVALID_MOVE';
    }

    const compCard = G.players[fpId]?.fellowshipArea?.find(
        (c) => c.id === companionId || c.instanceId === companionId
    );
    const minionCard = G.battlefield?.find(
        (c) => c.id === minionId || c.instanceId === minionId
    );

    if (!compCard) return 'INVALID_MOVE';

    const existingSkirmish = G.skirmishes.find(
        (s) => s.companionId === companionId
    );

    // 🟢 Capacité dynamique : 1 par défaut, ou (1 + X) si DEFENDER +X
    const maxCapacity = getCompanionDefenderCapacity(compCard, G);

    if (
        G.assignmentStep === 'FP_ASSIGN' &&
        existingSkirmish &&
        existingSkirmish.minionIds.length >= maxCapacity &&
        !existingSkirmish.minionIds.includes(minionId)
    ) {
        return 'INVALID_MOVE';
    }

    G.skirmishes.forEach((s) => {
        s.minionIds = s.minionIds.filter((id) => id !== minionId);
    });

    if (existingSkirmish) {
        if (!existingSkirmish.minionIds.includes(minionId)) {
            existingSkirmish.minionIds.push(minionId);
        }
    } else {
        G.skirmishes.push({
            id: `skirmish_${companionId}`,
            companionId,
            minionIds: [minionId],
        });
    }

    G.skirmishes = G.skirmishes.filter((s) => s.minionIds.length > 0);

    const compCardState = compCard.card || compCard;
    const minionCardState = minionCard?.card || minionCard;

    const compName = compCardState
        ? getCardText(compCardState, 'fr').title || 'le compagnon'
        : 'le compagnon';

    const minionName = minionCardState
        ? getCardText(minionCardState, 'fr').title || 'Le séide'
        : 'Le séide';

    G.statusMessage = `${minionName} est assigné à ${compName}.`;

    checkAssignmentProgress(G, ctx, events);
};

export const yieldAssignmentToShadow = ({
    G,
    playerID,
    events,
}: LotrMoveContext) => {
    const fpId = G.fpPlayerId || '0';
    if (playerID !== fpId) return 'INVALID_MOVE';
    if (G.assignmentStep !== 'FP_ASSIGN') return 'INVALID_MOVE';

    if (getUnassignedMinions(G).length === 0) {
        return 'INVALID_MOVE';
    }

    beginShadowAssignment(
        G,
        events,
        'Les Peuples Libres laissent l’Ombre affecter les séides restants.'
    );
};

export const assignmentMoves = {
    assignMinion,
    yieldAssignmentToShadow,
};