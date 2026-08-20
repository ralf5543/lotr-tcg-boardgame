import type { LotrMoveContext } from '../types';
import { checkAssignmentProgress } from '../logic/assignment';
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

    const compCard = G.players[fpId]?.fellowshipArea?.find(
        (c) => c.id === companionId || c.instanceId === companionId
    );
    const minionCard = G.battlefield?.find(
        (c) => c.id === minionId || c.instanceId === minionId
    );

    if (!compCard) return 'INVALID_MOVE';

    const existingSkirmish = G.skirmishes.find((s) => s.companionId === companionId);

    if (
        G.assignmentStep === 'FP_ASSIGN' &&
        existingSkirmish &&
        existingSkirmish.minionIds.length >= 1 &&
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

export const assignmentMoves = {
    assignMinion,
};