import { commonMoves } from './commonMoves';
import { fellowshipMoves } from './fellowshipMoves';
import { shadowMoves } from './shadowMoves';
import { archeryMoves } from './archeryMoves';
import { assignmentMoves } from './assignmentMoves';
import { regroupMoves } from './regroupMoves';
import { setupMoves } from './setupMoves';

export const allMoves = {
    ...commonMoves,
    ...fellowshipMoves,
    ...shadowMoves,
    ...archeryMoves,
    ...assignmentMoves,
    ...regroupMoves,
    ...setupMoves,
};

export {
    commonMoves,
    fellowshipMoves,
    shadowMoves,
    archeryMoves,
    assignmentMoves,
    regroupMoves,
    setupMoves,
};