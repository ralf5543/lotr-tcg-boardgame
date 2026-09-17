import type { GameState } from '../types';
import { hasActionableStartOfPhaseCards } from './hasActionableStartOfPhaseCards';
import {
    beginSanctuaryHeals,
    clearSanctuaryHeals,
} from './sanctuary';
import { exitStartOf } from './phaseEntry';

type PhaseEvents = {
    setPhase?: (phase: string) => void;
};

/** Capacités de début de compagnie, une fois le sanctuaire réglé. */
export const proceedStartOfFellowship = (
    G: GameState,
    events?: PhaseEvents
): void => {
    clearSanctuaryHeals(G);

    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';

    const fpDone = !hasActionableStartOfPhaseCards(
        G.players[fpId],
        G,
        fpId,
        'startOfFellowship'
    );
    const shadowDone = !hasActionableStartOfPhaseCards(
        G.players[shadowId],
        G,
        shadowId,
        'startOfFellowship'
    );

    G.startOfPhaseState = {
        players: {
            [fpId]: { isDone: fpDone },
            [shadowId]: { isDone: shadowDone },
        },
    };

    if (fpDone && shadowDone) {
        G.startOfPhaseState = undefined;
        exitStartOf(events, 'fellowship');
    } else {
        G.statusMessage =
            'Début de la phase de compagnie : Capacités spéciales.';
    }
};

export const onStartOfFellowshipBegin = (
    G: GameState,
    events?: PhaseEvents
): void => {
    if (beginSanctuaryHeals(G)) return;
    proceedStartOfFellowship(G, events);
};
