import type { Ctx } from 'boardgame.io';
import type { GameState, LotrMoveContext, LotrPhaseContext } from './types';
import { resolveSkirmish, finishSkirmishResolution, applyWoundToCard } from './skirmish';

export interface ReorderPayload {
    fromIndex?: number;
    toIndex?: number;
    oldIndex?: number;
    newIndex?: number;
}

export interface TransferPayload {
    attachmentId: string;
    fromCharacterId?: string;
    toCharacterId: string;
}

export type DevPresetType = 'ARCHERY_TEST' | 'SKIRMISH_TEST';

export const getTargetPlayerId = (
    playerID: string | undefined,
    ctx: Ctx
): string => {
    if (playerID !== undefined && playerID !== null && playerID !== '') {
        return String(playerID);
    }
    return String(ctx.currentPlayer ?? '0');
};

export const advanceCompany = (
    G: GameState,
    _ctx: Ctx,
    _playerID: string
) => {
    const p0 = G.players['0'];
    const nextIndex = p0.currentSiteIndex + 1;

    if (nextIndex >= 9) return;

    const applyTwilightForSite = (siteIndex: number) => {
        const targetSite = G.path[siteIndex];
        if (!targetSite) return;

        const siteCost = Number(targetSite.twilightCost) || 0;
        const companionsCount = p0.fellowshipArea
            ? p0.fellowshipArea.length
            : 0;
        const totalAdded = siteCost + companionsCount;

        G.twilightPool += totalAdded;
    };

    if (G.path[nextIndex] !== null) {
        p0.currentSiteIndex = nextIndex;
        applyTwilightForSite(nextIndex);

        G.statusMessage = `La compagnie avance au site ${nextIndex + 1} : ${G.path[nextIndex]?.name}`;
        
        // 🟢 Temporisation globale : signale la fin de phase sans l'exécuter immédiatement
        G.pendingPhaseEnd = true;
    } else {
        G.awaitingSiteSelection = true;
        G.statusMessage =
            "En attente du joueur de l'Ombre pour poser le prochain site...";
    }
};

export const passActionWindow = ({
    G,
    ctx,
    playerID,
}: LotrMoveContext) => {
    if (!G.actionWindow || !G.actionWindow.isOpen) return;
    if (playerID !== G.actionWindow.activePlayerId) return;

    const otherPlayer = playerID === '0' ? '1' : '0';
    const currentPasses = (G.actionWindow.passesCount || 0) + 1;

    if (currentPasses >= 2) {
        G.actionWindow = {
            ...G.actionWindow,
            isOpen: false,
            passesCount: 0,
        };

        if (ctx.phase === 'skirmish' && G.activeSkirmishId) {
            resolveSkirmish(G, ctx);
        }
    } else {
        G.actionWindow = {
            ...G.actionWindow,
            activePlayerId: otherPlayer,
            passesCount: currentPasses,
            message: `En attente de la réaction du joueur ${otherPlayer === '0' ? 'FP' : 'Ombre'}...`,
        };
    }
};

export const commonMoves = {
    passActionWindow,

    // 🟢 Move universel appelé par React après la temporisation globale de fin de phase
    confirmEndPhase: ({ G, events }: LotrMoveContext) => {
        if (G.pendingPhaseEnd) {
            G.pendingPhaseEnd = false;
            events?.endPhase?.();
        }
    },

    finishSkirmishResolution: ({ G, ctx, events }: LotrMoveContext) => {
        finishSkirmishResolution(G, ctx, events);
    },

    applyWound: ({ G }: LotrMoveContext, targetCardId: string) => {
        const companion = G.players['0'].fellowshipArea.find((c) => c.id === targetCardId);
        const minion = G.battlefield.find((c) => c.id === targetCardId);
        const targetCard = companion || minion;

        if (targetCard) {
            applyWoundToCard(G, targetCard, 1);
        }
    },

    devSetTwilight: ({ G }: LotrMoveContext, amount: number) => {
        G.twilightPool = Math.max(0, amount);
    },

    devSetPhase: ({ events }: LotrPhaseContext, targetPhase: string) => {
        events?.setPhase?.(targetPhase);
    },

    devForceEndPhase: ({ events }: LotrMoveContext) => {
        if (events) {
            events.setActivePlayers?.({ value: { '0': 'play', '1': 'play' } });
            events.endPhase?.();
        }
    },

    devLoadPreset: ({ G }: LotrMoveContext, presetType: DevPresetType) => {
        if (presetType === 'ARCHERY_TEST') {
            G.twilightPool = 8;
            G.players['0'].fellowshipArea = [
                {
                    id: 'dev-legolas',
                    name: 'Legolas',
                    kind: 'FREE_PEOPLES',
                    type: 'COMPANION',
                    twilightCost: 2,
                    strength: 6,
                    vitality: 3,
                    culture: 'ELVEN',
                    gameText: 'Archerie test card',
                    title: 'efsfsdf',
                    isUnique: true,
                },
                {
                    id: 'dev-legolas2',
                    name: 'Legolas',
                    kind: 'FREE_PEOPLES',
                    type: 'COMPANION',
                    twilightCost: 2,
                    strength: 6,
                    vitality: 3,
                    culture: 'ELVEN',
                    gameText: 'Archerie test card',
                    title: 'efsfsdf',
                    isUnique: true,
                },
            ];
            G.battlefield = [
                {
                    id: 'dev-nazgul',
                    name: 'Ukursh, Archor',
                    kind: 'SHADOW',
                    type: 'MINION',
                    twilightCost: 3,
                    strength: 6,
                    vitality: 2,
                    culture: 'ORC',
                    gameText: 'Archerie test card',
                    title: 'efsfsdf',
                    isUnique: false,
                },
                {
                    id: 'dev-nazgul2',
                    name: 'Ukursh, Archor',
                    kind: 'SHADOW',
                    type: 'MINION',
                    twilightCost: 3,
                    strength: 5,
                    vitality: 2,
                    culture: 'RAIDER',
                    gameText: 'Archerie test card',
                    title: 'efsfsdf',
                    isUnique: false,
                },
            ];
            G.statusMessage = '[DEV] Preset Archerie chargé !';
        }
    },

    drawCard: ({ G, ctx, playerID }: LotrMoveContext) => {
        const targetId = getTargetPlayerId(playerID, ctx);
        const player = G.players[targetId];

        if (player?.deck && player.deck.length > 0) {
            const card = player.deck.shift();
            if (card) player.hand.push(card);
        }
    },

    reorderFellowship: (
        { G, ctx, playerID }: LotrMoveContext,
        payload: ReorderPayload
    ) => {
        const targetId = getTargetPlayerId(playerID, ctx);
        const fromIndex = payload?.fromIndex ?? payload?.oldIndex;
        const toIndex = payload?.toIndex ?? payload?.newIndex;

        const player = G.players?.[targetId];
        if (!player || !Array.isArray(player.fellowshipArea)) return;

        const list = player.fellowshipArea;
        if (
            typeof fromIndex !== 'number' ||
            typeof toIndex !== 'number' ||
            fromIndex < 0 ||
            fromIndex >= list.length ||
            toIndex < 0 ||
            toIndex >= list.length ||
            fromIndex === toIndex
        ) {
            return;
        }

        const [movedCard] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, movedCard);
    },

    playSite: (
        { G, playerID }: LotrMoveContext,
        siteId: string,
        targetIndex: number
    ) => {
        const player = G.players[playerID];
        if (!player || !player.sitesDeck) return 'INVALID_MOVE';

        const siteIndex = player.sitesDeck.findIndex((s) => s.id === siteId);
        if (siteIndex === -1) return 'INVALID_MOVE';

        const nextEmptyIndex = G.path.findIndex((slot) => slot === null);
        if (targetIndex !== nextEmptyIndex) return 'INVALID_MOVE';

        const [playedSite] = player.sitesDeck.splice(siteIndex, 1);
        playedSite.ownerId = playerID;
        G.path[targetIndex] = playedSite;

        if (G.awaitingSiteSelection) {
            G.awaitingSiteSelection = false;
            const p0 = G.players['0'];
            p0.currentSiteIndex = targetIndex;

            const siteCost = Number(playedSite.twilightCost) || 0;
            const companionsCount = p0.fellowshipArea
                ? p0.fellowshipArea.length
                : 0;
            G.twilightPool += siteCost + companionsCount;

            G.statusMessage = `Nouveau site révélé ! La compagnie avance en ${playedSite.name}. (+${siteCost + companionsCount} Crépuscule)`;
            
            // 🟢 Temporisation globale
            G.pendingPhaseEnd = true;
        }
    },

    transferAttachment: (
        { G, ctx, playerID }: LotrMoveContext,
        payload: TransferPayload
    ) => {
        const { attachmentId, fromCharacterId, toCharacterId } = payload;
        const targetId = getTargetPlayerId(playerID, ctx);
        const player = G.players?.[targetId];
        if (!player) return;

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

        const targetHost = allPossibleHosts.find((c) => c.id === toCharacterId);
        if (!targetHost || sourceHost.id === targetHost.id)
            return 'INVALID_MOVE';

        const attachIndex = sourceHost.attachments.findIndex(
            (a) => a.id === attachmentId
        );
        if (attachIndex === -1) return 'INVALID_MOVE';

        const [movedAttachment] = sourceHost.attachments.splice(attachIndex, 1);

        if (!targetHost.attachments) {
            targetHost.attachments = [];
        }
        targetHost.attachments.push(movedAttachment);

        G.statusMessage = `${movedAttachment.name || 'Attachement'} est transféré de ${sourceHost.name || 'son hôte'} vers ${targetHost.name || 'sa cible'}.`;
    },
};