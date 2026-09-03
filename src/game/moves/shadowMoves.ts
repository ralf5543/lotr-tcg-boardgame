import type { LotrMoveContext } from '../types';

export interface TransferPayload {
    attachmentId: string;
    fromCharacterId?: string;
    toCharacterId: string;
}

const getTargetPlayerId = (
    playerID: string | undefined,
    ctx: { currentPlayer?: string }
): string => {
    if (playerID !== undefined && playerID !== null && playerID !== '') {
        return String(playerID);
    }
    return String(ctx.currentPlayer ?? '0');
};

export const transferAttachment = (
    { G, ctx, playerID }: LotrMoveContext,
    payload: TransferPayload
) => {
    const { attachmentId, fromCharacterId, toCharacterId } = payload;
    const targetId = getTargetPlayerId(playerID, ctx);
    const player = G.players?.[targetId];
    if (!player) return 'INVALID_MOVE';

    const allPossibleHosts = [
        ...(player.fellowshipArea || []),
        ...(player.supportArea || []),
        ...(G.battlefield || []),
    ];

    const sourceHost = fromCharacterId
        ? allPossibleHosts.find((c) => c.id === fromCharacterId)
        : allPossibleHosts.find((c) =>
              c.attachments?.some((a) => a.id === attachmentId)
          );

    if (!sourceHost || !sourceHost.attachments) return 'INVALID_MOVE';

    const attachIndex = sourceHost.attachments.findIndex((a) => a.id === attachmentId);
    if (attachIndex === -1) return 'INVALID_MOVE';

    const movedAttachment = sourceHost.attachments[attachIndex];

    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';

    if (movedAttachment.kind === 'SHADOW') {
        if (ctx.phase !== 'shadow' || playerID !== shadowId) {
            return 'INVALID_MOVE';
        }
    } else {
        if (ctx.phase !== 'fellowship' || playerID !== fpId) {
            return 'INVALID_MOVE';
        }
    }

    const targetHost = allPossibleHosts.find((c) => c.id === toCharacterId);
    if (!targetHost || sourceHost.id === targetHost.id) return 'INVALID_MOVE';

    const cost = Number(movedAttachment.twilightCost) || 0;

    if (movedAttachment.kind === 'SHADOW') {
        if (G.twilightPool < cost) return 'INVALID_MOVE';
        G.twilightPool -= cost;
    } else {
        G.twilightPool += cost;
    }

    sourceHost.attachments.splice(attachIndex, 1);

    if (!targetHost.attachments) {
        targetHost.attachments = [];
    }
    targetHost.attachments.push(movedAttachment);

    const attachmentTitle = movedAttachment.title || movedAttachment.name || 'Attachement';
    const sourceTitle = sourceHost.title || sourceHost.name || 'son hôte';
    const targetTitle = targetHost.title || targetHost.name || 'sa cible';

    G.statusMessage = `${attachmentTitle} est transféré de ${sourceTitle} vers ${targetTitle} (Coût : ${cost} Crépuscule).`;
};

export const shadowMoves = {
    transferAttachment,
};