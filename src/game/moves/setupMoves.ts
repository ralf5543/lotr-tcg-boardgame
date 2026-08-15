import type { LotrMoveContext } from '../types';
import { drawCardsForPlayer } from '../../utils/drawCards';

export const submitMulliganChoice = (
    { G, events, playerID }: LotrMoveContext,
    doMulligan: boolean
) => {
    if (!G.setupState || G.setupState.step !== 'MULLIGAN') {
        console.warn('⚠️ [moves.submitMulliganChoice] Action rejetée : Hors phase de mulligan.');
        return 'INVALID_MOVE';
    }

    const pId = String(playerID ?? '0');
    const player = G.players?.[pId];
    if (!player) return 'INVALID_MOVE';

    if (G.setupState.mulligans?.[pId] !== null) {
        console.warn(`⚠️ [moves.submitMulliganChoice] Le joueur ${pId} a déjà choisi.`);
        return 'INVALID_MOVE';
    }

    G.setupState.mulligans[pId] = doMulligan;

    if (doMulligan) {
        player.deck.push(...player.hand);
        player.hand = [];
        drawCardsForPlayer(G, player, 8, false);
    }

    const m0 = G.setupState.mulligans['0'];
    const m1 = G.setupState.mulligans['1'];

    if (m0 !== null && m1 !== null) {
        G.setupState.step = 'COMPLETE';
        G.statusMessage = 'Mise en place terminée ! Début de la partie.';

        if (events?.setPhase) {
            events.setPhase('fellowship');
        }
    } else {
        G.statusMessage = `Le joueur ${pId} a validé sa main. En attente de l'adversaire...`;
    }
};

export const setupMoves = {
    submitMulliganChoice,
};