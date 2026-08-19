import type { LotrMoveContext } from '../types';
import { resolveSkirmish } from '../logic/skirmish';
import { applyWoundAndCheckDeath } from '../../utils/applyWoundAndCheckDeath';
import { drawCardsForPlayer } from '../../utils/drawCards';
import { advanceArcheryAssignmentStep } from '../index';
import { getEffectiveVitality } from '../../utils/cardStats';
import { devMoves } from '../dev/devMoves';
import { playSite } from './fellowshipMoves';
import { canPlayCard } from '../engine/canPlayCard';
export interface ReorderPayload {
    fromIndex?: number;
    toIndex?: number;
    oldIndex?: number;
    newIndex?: number;
}

const getTargetPlayerId = (playerID: string | undefined, ctx: any): string => {
    if (playerID !== undefined && playerID !== null && playerID !== '') {
        return String(playerID);
    }
    return String(ctx.currentPlayer ?? '0');
};

export const passActionWindow = ({
    G,
    ctx,
    playerID,
    events,
}: LotrMoveContext) => {
    if (!G.actionWindow || !G.actionWindow.isOpen) {
        console.warn(
            '⚠️ [moves.passActionWindow] Aucune fenêtre d’action ouverte.'
        );
        return;
    }
    if (playerID !== G.actionWindow.activePlayerId) {
        console.warn(
            `❌ [moves.passActionWindow] Tentative de passer hors tour. Actif: ${G.actionWindow.activePlayerId}, Reçu: ${playerID}`
        );
        return;
    }

    const otherPlayer = playerID === '0' ? '1' : '0';
    const currentPasses = (G.actionWindow.passesCount || 0) + 1;

    if (currentPasses >= 2) {
        G.actionWindow = { ...G.actionWindow, isOpen: false, passesCount: 0 };

        if (ctx.phase === 'maneuver') {
            G.statusMessage =
                'Manœuvre terminée. Passage à la phase d’Archerie.';
            events?.endPhase?.();
        } else if (ctx.phase === 'archery') {
            advanceArcheryAssignmentStep(G, events);
        } else if (ctx.phase === 'skirmish' && G.activeSkirmishId) {
            resolveSkirmish(G, ctx);
        } else if (ctx.phase === 'regroup') {
            G.regroupStep = 'SHADOW_REFILL';
            G.statusMessage =
                'Ombre : Vous pouvez défausser 1 carte, puis validez votre main à 8 cartes.';
        }
    } else {
        const fpId = G.fpPlayerId || '0';
        G.actionWindow = {
            ...G.actionWindow,
            activePlayerId: otherPlayer,
            passesCount: currentPasses,
            message: `Au tour du joueur ${otherPlayer === fpId ? 'FP' : 'Ombre'} d’agir ou de passer.`,
        };
    }
};

export const attachCard = (
    { G, ctx, playerID }: LotrMoveContext,
    cardIndex: number,
    targetId: string
) => {
    const actingPlayerId = playerID ?? ctx.currentPlayer ?? '0';
    const player = G.players[actingPlayerId];

    if (!player || !player.hand || !player.hand[cardIndex])
        return 'INVALID_MOVE';

    const card = player.hand[cardIndex];
    const fpId = G.fpPlayerId || '0';
    const isFP = actingPlayerId === fpId;

    if (isFP && ctx.phase !== 'fellowship') return 'INVALID_MOVE';
    if (!isFP && ctx.phase !== 'shadow') return 'INVALID_MOVE';

    const fpPlayer = G.players[fpId];
    const allPossibleTargets = [
        ...(fpPlayer?.fellowshipArea || []),
        ...(fpPlayer?.supportArea || []),
        ...(player.supportArea || []),
        ...(G.battlefield || []),
    ];

    const targetCharacter = allPossibleTargets.find(
        (c: any) =>
            c.id === targetId ||
            c.instanceId === targetId ||
            c.uuid === targetId
    );

    if (!targetCharacter) return 'INVALID_MOVE';

    const cost = Number(card.twilightCost) || 0;

    if (isFP) {
        if (card.kind !== 'FREE_PEOPLE') return 'INVALID_MOVE';
        G.twilightPool += cost;
    } else {
        if (card.kind !== 'SHADOW') return 'INVALID_MOVE';
        if (G.twilightPool < cost) return 'INVALID_MOVE';
        G.twilightPool -= cost;
    }

    const [attachedCard] = player.hand.splice(cardIndex, 1);
    if (!targetCharacter.attachments) targetCharacter.attachments = [];
    targetCharacter.attachments.push(attachedCard);

    const cardName = attachedCard.title || attachedCard.name || 'Une carte';
    const targetName =
        targetCharacter.title || targetCharacter.name || 'le personnage';

    G.statusMessage = `${cardName} a été attaché à ${targetName}.`;
};

export const playCard = (
    { G, ctx, playerID }: LotrMoveContext,
    cardIndex: number
) => {
    const actingPlayerId = playerID ?? ctx.currentPlayer ?? '0';
    const player = G.players[actingPlayerId];

    if (!player || !player.hand || !player.hand[cardIndex]) {
        console.warn(`❌ [playCard] Joueur ou carte introuvable à l'index ${cardIndex}`);
        return 'INVALID_MOVE';
    }

    const card = player.hand[cardIndex];

    // 🟢 VALIDATION CENTRALISÉE (Unicité, Phase, Kind, Twilight)
    const validation = canPlayCard(card, { G, ctx, playerID: actingPlayerId });
    if (!validation.valid) {
        console.warn(`❌ [playCard] Rejet : ${validation.reason}`);
        return 'INVALID_MOVE';
    }

    const fpId = G.fpPlayerId || '0';
    const isFP = actingPlayerId === fpId;

    if (isFP) {
        const cost = Number(card.twilightCost) || 0;
        const [playedCard] = player.hand.splice(cardIndex, 1);
        G.twilightPool += cost;

        if (playedCard.type === 'COMPANION') {
            if (!player.fellowshipArea) player.fellowshipArea = [];
            playedCard.isFaceDown = false;
            player.fellowshipArea.push(playedCard);
            G.statusMessage = `${playedCard.title} rejoint la Communauté (+${cost} Crépuscule).`;
        } else if (
            [
                'ALLY',
                'FOLLOWER',
                'ARTIFACT',
                'CONDITION',
                'POSSESSION',
            ].includes(playedCard.type)
        ) {
            if (!player.supportArea) player.supportArea = [];
            player.supportArea.push(playedCard);
            G.statusMessage = `${playedCard.title} rejoint l'aire de soutien (+${cost} Crépuscule).`;
        } else if (playedCard.type === 'EVENT') {
            if (!player.discard) player.discard = [];
            player.discard.push(playedCard);
            G.statusMessage = `${playedCard.title} est joué (+${cost} Crépuscule).`;
        } else {
            console.warn(
                `❌ [playCard] Type de carte inconnu/non géré pour FP: ${playedCard.type}`
            );
            player.hand.splice(cardIndex, 0, playedCard);
            G.twilightPool -= cost;
            return 'INVALID_MOVE';
        }
        return;
    }

    if (!isFP) {
        const cost = Number(card.twilightCost) || 0;
        G.twilightPool -= cost;
        const [playedCard] = player.hand.splice(cardIndex, 1);

        if (playedCard.type === 'MINION') {
            if (!G.battlefield) G.battlefield = [];
            G.battlefield.push(playedCard);
            G.statusMessage = `${playedCard.title} entre sur le champ de bataille (-${cost} Crépuscule).`;
        } else if (
            [
                'ALLY',
                'FOLLOWER',
                'ARTIFACT',
                'CONDITION',
                'POSSESSION',
            ].includes(playedCard.type)
        ) {
            if (!player.supportArea) player.supportArea = [];
            player.supportArea.push(playedCard);
            G.statusMessage = `${playedCard.title} rejoint l'aire de soutien de l'Ombre (-${cost} Crépuscule).`;
        } else if (playedCard.type === 'EVENT') {
            if (!player.discard) player.discard = [];
            player.discard.push(playedCard);
            G.statusMessage = `${playedCard.title} est joué (-${cost} Crépuscule).`;
        } else {
            console.warn(
                `❌ [playCard] Type de carte inconnu/non géré pour Ombre: ${playedCard.type}`
            );
            player.hand.splice(cardIndex, 0, playedCard);
            G.twilightPool += cost;
            return 'INVALID_MOVE';
        }
    }
};

export const applyWound = ({ G }: LotrMoveContext, targetCardId: string) => {
    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';

    const fpPlayer = G.players[fpId];
    const shadowPlayer = G.players[shadowId];

    // Recherche de la carte cible dans toutes les zones possibles
    const targetCard =
        fpPlayer?.fellowshipArea?.find(
            (c) => c.id === targetCardId || c.instanceId === targetCardId
        ) ||
        fpPlayer?.supportArea?.find(
            (c) => c.id === targetCardId || c.instanceId === targetCardId
        ) ||
        shadowPlayer?.supportArea?.find(
            (c) => c.id === targetCardId || c.instanceId === targetCardId
        ) ||
        (G.battlefield || []).find(
            (c) => c.id === targetCardId || c.instanceId === targetCardId
        );

    if (targetCard) {
        applyWoundAndCheckDeath(G, targetCard, 1);
    }
};

export const drawCard = (
    { G, ctx, playerID }: LotrMoveContext,
    count: number = 1
) => {
    const targetId = getTargetPlayerId(playerID, ctx);
    const player = G.players[targetId];
    if (!player) return 'INVALID_MOVE';

    const isFellowship = ctx.phase === 'fellowship';
    drawCardsForPlayer(G, player, count, isFellowship);
};

export const reorderFellowship = (
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
};

export const confirmEndPhase = ({ G, events }: LotrMoveContext) => {
    if (G.pendingPhaseEnd) {
        G.pendingPhaseEnd = false;
        events?.endPhase?.();
    }
};

export const cleanupPendingDeaths = ({ G }: LotrMoveContext) => {
    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';

    const fpPlayer = G.players[fpId];
    if (fpPlayer?.fellowshipArea) {
        fpPlayer.fellowshipArea = fpPlayer.fellowshipArea.filter((c: any) => {
            const remainingVitality = getEffectiveVitality(c);
            const dead = c.isDead || remainingVitality <= 0;
            if (dead) {
                if (!fpPlayer.deadPile) fpPlayer.deadPile = [];
                fpPlayer.deadPile.push(c);
            }
            return !dead;
        });
    }

    G.battlefield = (G.battlefield || []).filter((c: any) => {
        const remainingVitality = getEffectiveVitality(c);
        const dead = c.isDead || remainingVitality <= 0;
        if (dead) {
            const shadowPlayer = G.players[shadowId];
            if (shadowPlayer) {
                if (!shadowPlayer.discard) shadowPlayer.discard = [];
                shadowPlayer.discard.push(c);
            }
        }
        return !dead;
    });

    if (G.activeSkirmishId) {
        const skirmishIndex = G.skirmishes.findIndex(
            (s) => s.id === G.activeSkirmishId
        );
        if (skirmishIndex !== -1) {
            G.skirmishes.splice(skirmishIndex, 1);
        }
        G.activeSkirmishId = undefined;
    }
    G.pendingDeadCardIds = [];
    G.lastWoundedCardIds = [];

    console.log(
        'Morts dans la deadPile des FP :',
        JSON.parse(JSON.stringify(fpPlayer.deadPile))
    );
};

export const commonMoves = {
    passActionWindow,
    attachCard,
    playCard,
    playSite,
    applyWound,
    drawCard,
    reorderFellowship,
    confirmEndPhase,
    cleanupPendingDeaths,
    ...(process.env.NODE_ENV !== 'production' ? devMoves : {}),
};
