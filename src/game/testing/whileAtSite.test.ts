import { describe, expect, it } from 'vitest';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';
import type { Ability, SiteCardState } from '../types';

const whileUnderground2: Ability = {
    id: '11S115:0',
    phases: [],
    trigger: { type: 'WHILE', atSiteKeyword: 'UNDERGROUND' },
    cost: [],
    effects: [
        {
            type: 'MODIFY_STAT',
            stat: 'STRENGTH',
            value: 2,
            target: 'SELF',
        },
    ],
    source: 'SELF',
};

function pathWith(
    index: number,
    site: SiteCardState
): (SiteCardState | null)[] {
    const path = Array.from({ length: 9 }, () => null) as (
        | SiteCardState
        | null
    )[];
    path[index] = site;
    return path;
}

describe('While at a … site → force', () => {
    it('booste le séide sur un site UNDERGROUND', () => {
        const minion = createMinion({
            id: '11S115',
            instanceId: 'denizen',
            strength: 9,
            abilities: [whileUnderground2],
        });
        const G = createGameState({
            path: pathWith(
                0,
                createSite({
                    id: '11S263',
                    keywords: ['UNDERGROUND'],
                    siteNumber: 1,
                })
            ),
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
                '1': createPlayerState('1', {
                    currentSiteIndex: 0,
                    fellowshipArea: [],
                }),
            },
            battlefield: [minion],
            fpPlayerId: '0',
        });

        expect(getCalculatedStrength(G, minion)).toBe(11);
    });

    it('n’applique pas le bonus hors terrain', () => {
        const minion = createMinion({
            id: '11S115',
            instanceId: 'denizen',
            strength: 9,
            abilities: [whileUnderground2],
        });
        const G = createGameState({
            path: pathWith(
                2,
                createSite({
                    id: 'plains',
                    keywords: ['PLAINS'],
                    siteNumber: 3,
                })
            ),
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 2 }),
            },
            battlefield: [minion],
        });

        expect(getCalculatedStrength(G, minion)).toBe(9);
    });

    it('booste un compagnon sur FOREST', () => {
        const companion = createCompanion({
            id: '11C27',
            instanceId: 'sentinel',
            strength: 5,
            abilities: [
                {
                    id: '11C27:0',
                    phases: [],
                    trigger: { type: 'WHILE', atSiteKeyword: 'FOREST' },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 2,
                            target: 'SELF',
                        },
                    ],
                    source: 'SELF',
                },
            ],
        });
        const G = createGameState({
            path: pathWith(
                4,
                createSite({
                    id: '11S231',
                    keywords: ['FOREST'],
                    siteNumber: 5,
                })
            ),
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 4,
                    fellowshipArea: [companion],
                }),
            },
        });

        expect(getCalculatedStrength(G, companion)).toBe(7);
    });
});
