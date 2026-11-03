import { commonMoves } from './commonMoves';
import { fellowshipMoves } from './fellowshipMoves';
import { shadowMoves } from './shadowMoves';
import { archeryMoves } from './archeryMoves';
import { assignmentMoves } from './assignmentMoves';
import { regroupMoves } from './regroupMoves';
import { setupMoves } from './setupMoves';
import { maneuverMoves } from './maneuverMoves';
import { abilityMoves } from './abilityMoves';
import { wrapMovesAgainstGameEnd } from './guardGameEnd';
import { dismissGameEndOverlay as dismissGameEndOverlayState } from '../logic/gameEnd';
import type { LotrMoveContext } from '../types';

const rawMoves = {
    ...commonMoves,
    ...fellowshipMoves,
    ...shadowMoves,
    ...archeryMoves,
    ...assignmentMoves,
    ...regroupMoves,
    ...setupMoves,
    ...maneuverMoves,
    ...abilityMoves,
    dismissGameEndOverlay: ({ G }: LotrMoveContext) => {
        if (!G.gameResult) return 'INVALID_MOVE';
        dismissGameEndOverlayState(G);
    },
};

export const allMoves = wrapMovesAgainstGameEnd(rawMoves);

export {
    commonMoves,
    fellowshipMoves,
    shadowMoves,
    archeryMoves,
    assignmentMoves,
    regroupMoves,
    setupMoves,
    maneuverMoves,
    abilityMoves,
};