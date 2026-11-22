import type { LotrMoveContext } from '../types';
import { setStatus } from '../../i18n/status';
import { drawCardsForPlayer } from '../../utils/drawCards';
import {
    otherPlayerId,
    playerDisplayName,
} from '../logic/playerName';
import {
    appendActorJournalNotice,
    appendJournalNotice,
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
    appendActorJournalNotice(
        G,
        pId,
        doMulligan ? 'MULLIGAN_DONE' : 'MULLIGAN_KEPT',
        { player: name }
    );

    if (m0 !== null && m1 !== null) {
        G.setupState.step = 'COMPLETE';
        appendJournalNotice(G, 'SETUP_COMPLETE');
        setStatus(G, 'SETUP_COMPLETE');

        if (events?.setPhase) {
            events.setPhase('startOfFellowship');
        }
    } else {
        setStatus(G, 'MULLIGAN_WAITING', {
            name,
            didMulligan: doMulligan,
            other: playerDisplayName(G, otherPlayerId(pId)),
        });
    }
};

export const setupMoves = {
    submitMulliganChoice,
};