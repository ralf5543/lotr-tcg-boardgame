import { describe, expect, it } from 'vitest';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import {
    createCard,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';
import type { Ability, CardKeyword, SiteCardState } from '../types';

function pathOf(
    keywords: (CardKeyword | null)[]
): (SiteCardState | null)[] {
    return keywords.map((kw, i) =>
        kw
            ? createSite({
                  id: `site-${i}`,
                  keywords: [kw],
                  siteNumber: i + 1,
              })
            : null
    );
}

const spot3UndergroundMuster: Ability = {
    id: '13C120:0',
    phases: [],
    trigger: {
        type: 'WHILE',
        spotSiteKeyword: { keyword: 'UNDERGROUND', count: 3 },
    },
    cost: [],
    effects: [
        {
            type: 'MODIFY_KEYWORD',
            keyword: 'MUSTER',
            target: [['ORC', 'ORC']],
        },
    ],
    source: 'SELF',
};

describe('While spot N terrain sites → keyword', () => {
    it('accorde Muster aux Orques si 3 sites underground sur le chemin', () => {
        const condition = createCard({
            id: '13C120',
            instanceId: 'depths',
            kind: 'SHADOW',
            type: 'CONDITION',
            abilities: [spot3UndergroundMuster],
        });
        const orc = createMinion({
            id: 'orc-1',
            instanceId: 'orc-1',
            culture: 'ORC',
            race: 'ORC',
        });
        const withThree = createGameState({
            path: pathOf([
                'UNDERGROUND',
                'UNDERGROUND',
                'PLAINS',
                'UNDERGROUND',
                null,
                null,
                null,
                null,
                null,
            ]),
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
                '1': createPlayerState('1', {
                    supportArea: [condition],
                }),
            },
            battlefield: [orc],
            fpPlayerId: '0',
        });
        const withTwo = createGameState({
            path: pathOf([
                'UNDERGROUND',
                'UNDERGROUND',
                'PLAINS',
                null,
                null,
                null,
                null,
                null,
                null,
            ]),
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
                '1': createPlayerState('1', {
                    supportArea: [condition],
                }),
            },
            battlefield: [orc],
            fpPlayerId: '0',
        });

        expect(getKeywordValue(orc, 'MUSTER', withThree)).toBe(0);
        expect(getKeywordValue(orc, 'MUSTER', withTwo)).toBe(-1);
    });
});
