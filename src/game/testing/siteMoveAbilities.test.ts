import { describe, expect, it } from 'vitest';
import { advanceCompany } from '../moves/fellowshipMoves';
import type { Ability } from '../types';
import {
    createGameState,
    createCompanion,
    createPlayerState,
    createSite,
} from './createGameState';

const moveFromRemove2: Ability = {
    id: '11S263:0:site-move',
    phases: [],
    cost: [],
    effects: [{ type: 'REMOVE_TWILIGHT', count: 2 }],
    source: 'SELF',
    trigger: { type: 'MOVES_FROM' },
};

describe('site move abilities', () => {
    it('retire le crépuscule au départ après le coût du move (11S263)', () => {
        const fromSite = createSite({
            id: '11S263',
            name: 'West Gate of Moria',
            twilightCost: 2,
            keywords: ['UNDERGROUND'],
            abilities: [moveFromRemove2],
            siteNumber: 1,
        });
        const toSite = createSite({
            id: '11S231',
            name: 'Caras Galadhon',
            twilightCost: 1,
            siteNumber: 2,
        });

        const G = createGameState({
            twilightPool: 0,
            path: [
                fromSite,
                toSite,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [
                        createCompanion({ id: 'c1' }),
                        createCompanion({ id: 'c2' }),
                    ],
                }),
            },
        });

        advanceCompany(G);

        // Move : site 1 + 2 compagnons + région 1 (0) = 3, puis remove 2
        expect(G.players['0']?.currentSiteIndex).toBe(1);
        expect(G.twilightPool).toBe(1);
    });

    it('n’applique rien si le site n’a pas d’ability', () => {
        const G = createGameState({
            twilightPool: 0,
            path: [
                createSite({ id: 'a', twilightCost: 0 }),
                createSite({ id: 'b', twilightCost: 2 }),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [createCompanion({ id: 'c1' })],
                }),
            },
        });

        advanceCompany(G);
        expect(G.twilightPool).toBe(3); // 2 + 1 compagnon
    });
});
