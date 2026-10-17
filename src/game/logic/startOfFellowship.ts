import type { GameState } from '../types';
import {
    beginSanctuaryHeals,
    clearSanctuaryHeals,
} from './sanctuary';
import {
    beginOptionalSiteStartAbility,
    openStartOfFellowshipDualWait,
} from './siteStartAbility';

type PhaseEvents = {
    setPhase?: (phase: string) => void;
};

/** Capacités de début de compagnie, une fois le sanctuaire réglé. */
export const proceedStartOfFellowship = (
    G: GameState,
    events?: PhaseEvents
): void => {
    clearSanctuaryHeals(G);

    // Site optionnel d’abord (toaster Activer / Passer) — pas de sceau sur le site.
    if (beginOptionalSiteStartAbility(G, 'startOfFellowship')) {
        return;
    }

    openStartOfFellowshipDualWait(G, events);
};

export const onStartOfFellowshipBegin = (
    G: GameState,
    events?: PhaseEvents
): void => {
    if (beginSanctuaryHeals(G)) return;
    proceedStartOfFellowship(G, events);
};
