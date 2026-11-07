import type { LotrMoveContext } from '../types';
import { drawCardsForPlayer } from '../../utils/drawCards';
import {
    otherPlayerId,
    playerDisplayName,
} from '../logic/playerName';
import {
    appendActorJournal,
    appendJournal,
} from '../logic/journal';

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

    const name = playerDisplayName(G, pId);
    appendActorJournal(
        G,
        pId,
        doMulligan
            ? {
                  vous: 'Vous avez fait un mulligan.',
                  named: `${name} a fait un mulligan.`,
              }
            : {
                  vous: 'Vous avez gardé votre main.',
                  named: `${name} a gardé sa main.`,
              }
    );

    if (m0 !== null && m1 !== null) {
        G.setupState.step = 'COMPLETE';
        appendJournal(G, 'Mise en place terminée. Début de la partie.');
        G.statusMessage = 'Mise en place terminée ! Début de la partie.';

        if (events?.setPhase) {
            events.setPhase('startOfFellowship');
        }
    } else {
        const live = doMulligan
            ? `${name} a fait un mulligan.`
            : `${name} a gardé sa main.`;
        G.statusMessage = `${live} En attente de ${playerDisplayName(G, otherPlayerId(pId))}…`;
    }
};

export const setupMoves = {
    submitMulliganChoice,
};