import type { LotrMoveContext } from '../types';
import { resolveSkirmish } from '../logic/skirmish';
import { applyWoundAndCheckDeath } from '../../utils/applyWoundAndCheckDeath';
import { drawCardsForPlayer } from '../../utils/drawCards';
import { advanceArcheryAssignmentStep } from '../index';
import { getEffectiveVitality } from '../../utils/cardStats';
import { devMoves } from '../dev/devMoves';
import { playSite } from './fellowshipMoves';
import { canPlayCard } from '../engine/canPlayCard';
import { applyEventAbility } from '../engine/abilities/playEventAbility';
import { clearExpiredTempKeywords } from '../engine/abilities/applyAbilityEffect';
import { yieldPriorityAfterAction } from '../engine/actionWindow';
import { findTargetCard } from '../../utils/cardUtils';

export interface ReorderPayload {
    fromIndex?: number;
    toIndex?: number;
    oldIndex?: number;
    newIndex?: number;
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

/**
 * Move universelle pour valider la fin des actions de début de phase (startOf*)
 */
export const confirmStartOfPhase = ({
    G,
    ctx,
    events,
    playerID,
}: LotrMoveContext) => {
    const currentPhase = ctx.phase || '';

    if (
        !currentPhase.startsWith('startOf') ||
        !G.startOfPhaseState?.players?.[playerID]
    ) {
        return 'INVALID_MOVE';
    }

    G.startOfPhaseState.players[playerID].isDone = true;

    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';

    const fpDone = G.startOfPhaseState.players[fpId]?.isDone;
    const shadowDone = G.startOfPhaseState.players[shadowId]?.isDone;

    if (fpDone && shadowDone) {
        G.startOfPhaseState = undefined;

        // Transformation universelle : 'startOfArchery' -> 'archery'
        const targetPhase = currentPhase
            .replace(/^startOf/, '')
            .replace(/^./, (str) => str.toLowerCase());

        events?.setPhase?.(targetPhase);
    } else {
        G.statusMessage = `Joueur ${playerID} a terminé ses actions de début de phase. En attente de l'adversaire...`;
    }
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
        } else if (ctx.phase === 'regroup' || ctx.phase === 'startOfRegroup') {
            if (ctx.phase === 'startOfRegroup') {
                events?.setPhase?.('regroup');
            }

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
    targetCharacterId: string
) => {
    const actingPlayerId = playerID ?? ctx.currentPlayer ?? '0';
    const player = G.players[actingPlayerId];

    if (!player || !player.hand || !player.hand[cardIndex]) {
        return 'INVALID_MOVE';
    }

    const card = player.hand[cardIndex];

    const targetCard = findTargetCard(G, targetCharacterId);

    const validation = canPlayCard(
        card,
        { G, ctx, playerID: actingPlayerId },
        targetCharacterId,
        targetCard
    );

    if (!validation.valid) {
        console.warn(`❌ [attachCard] Rejet : ${validation.reason}`);
        return 'INVALID_MOVE';
    }

    const cost = Number(card.twilightCost) || 0;
    const fpId = G.fpPlayerId || '0';
    const isFP = actingPlayerId === fpId;

    const [attachedCard] = player.hand.splice(cardIndex, 1);
    if (isFP) {
        G.twilightPool += cost;
    } else {
        G.twilightPool = Math.max(0, (G.twilightPool || 0) - cost);
    }

    if (targetCard) {
        if (!targetCard.attachments) targetCard.attachments = [];
        targetCard.attachments.push(attachedCard);
        const sign = isFP ? '+' : '-';
        G.statusMessage = `${attachedCard.title || attachedCard.i18n?.fr?.title || 'Carte'} est attaché à ${targetCard.title || targetCard.i18n?.fr?.title || 'Personnage'} (${sign}${cost} Crépuscule).`;
    }
};

const getActingPlayerId = (
    playerID: string | undefined,
    ctx: { currentPlayer?: string }
): string => playerID ?? ctx.currentPlayer ?? '0';

export const beginPendingPlay = (
    { G, ctx, playerID }: LotrMoveContext,
    cardIndex: number,
    prompt: string
) => {
    const actingPlayerId = getActingPlayerId(playerID, ctx);
    if (G.pendingPlay && G.pendingPlay.playerId !== actingPlayerId) {
        return 'INVALID_MOVE';
    }

    const player = G.players[actingPlayerId];
    const card = player?.hand?.[cardIndex];
    if (!card || card.type !== 'EVENT') return 'INVALID_MOVE';

    const validation = canPlayCard(card, { G, ctx, playerID: actingPlayerId });
    if (!validation.valid) return 'INVALID_MOVE';

    G.pendingPlay = {
        playerId: actingPlayerId,
        card: { ...card },
        handIndex: cardIndex,
        prompt: prompt || 'Choisissez une cible.',
    };
};

export const cancelPendingPlay = ({ G, playerID }: LotrMoveContext) => {
    if (!G.pendingPlay || G.pendingPlay.playerId !== playerID) {
        return 'INVALID_MOVE';
    }
    G.pendingPlay = undefined;
};

export const playCard = (
    { G, ctx, playerID }: LotrMoveContext,
    cardIndex: number,
    chosenTargetId?: string
) => {
    const actingPlayerId = playerID ?? ctx.currentPlayer ?? '0';
    const player = G.players[actingPlayerId];

    if (!player || !player.hand || !player.hand[cardIndex]) {
        console.warn(
            `❌ [playCard] Joueur ou carte introuvable à l'index ${cardIndex}`
        );
        return 'INVALID_MOVE';
    }

    const card = player.hand[cardIndex];

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
            if (!applyEventAbility(G, playedCard, ctx.phase || '', chosenTargetId)) {
                player.hand.splice(cardIndex, 0, playedCard);
                G.twilightPool -= cost;
                return 'INVALID_MOVE';
            }
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
        yieldPriorityAfterAction(G, actingPlayerId);
        G.pendingPlay = undefined;
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
            if (!applyEventAbility(G, playedCard, ctx.phase || '', chosenTargetId)) {
                player.hand.splice(cardIndex, 0, playedCard);
                G.twilightPool += cost;
                return 'INVALID_MOVE';
            }
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
        yieldPriorityAfterAction(G, actingPlayerId);
        G.pendingPlay = undefined;
    }
};

export const applyWound = ({ G }: LotrMoveContext, targetCardId: string) => {
    const targetCard = findTargetCard(G, targetCardId);

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
        const skirmish =
            skirmishIndex !== -1 ? G.skirmishes[skirmishIndex] : undefined;
        // Un exert pendant le combat remplit lastWoundedCardIds : on ne clôture
        // le combat que s'il a déjà été résolu.
        if (skirmish?.resolved) {
            G.skirmishes.splice(skirmishIndex, 1);
            G.activeSkirmishId = undefined;
            clearExpiredTempKeywords(G, 'SKIRMISH');
        }
    }
    G.pendingDeadCardIds = [];
    G.lastWoundedCardIds = [];
};

export const commonMoves = {
    confirmStartOfPhase,
    passActionWindow,
    attachCard,
    beginPendingPlay,
    cancelPendingPlay,
    playCard,
    playSite,
    applyWound,
    drawCard,
    reorderFellowship,
    confirmEndPhase,
    cleanupPendingDeaths,
    ...(process.env.NODE_ENV !== 'production' ? devMoves : {}),
};
