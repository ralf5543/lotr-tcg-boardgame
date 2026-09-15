import { describe, expect, it } from 'vitest';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import {
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';
import type { Ability } from '../types';

describe('While spot → Damage / fierce', () => {
    const damageWhile: Ability = {
        id: '4R176:1',
        phases: [],
        trigger: {
            type: 'WHILE',
            spot: [{ count: 3, target: [['ISENGARD', 'TRACKER']] }],
        },
        cost: [],
        effects: [
            {
                type: 'MODIFY_KEYWORD',
                keyword: 'DAMAGE +1',
                target: 'SELF',
            },
        ],
        source: 'SELF',
    };

    const fierceWhile: Ability = {
        id: '10U82:0',
        phases: [],
        trigger: {
            type: 'WHILE',
            spot: [{ count: 3, target: [['POSSESSION']] }],
        },
        cost: [],
        effects: [
            {
                type: 'MODIFY_KEYWORD',
                keyword: 'FIERCE',
                target: 'SELF',
            },
        ],
        source: 'SELF',
    };

    it('accorde Damage +1 quand le spot tient', () => {
        const ugluk = createMinion({
            id: '4R176',
            instanceId: 'ugluk',
            title: 'Uglúk',
            culture: 'ISENGARD',
            race: 'URUK-HAI',
            keywords: ['TRACKER'],
            abilities: [damageWhile],
        });
        const trackers = [1, 2, 3].map((n) =>
            createMinion({
                id: `tracker-${n}`,
                instanceId: `tracker-${n}`,
                culture: 'ISENGARD',
                keywords: ['TRACKER'],
            })
        );

        const G = createGameState({
            battlefield: [ugluk, ...trackers],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1'),
            },
        });

        expect(getKeywordValue(ugluk, 'DAMAGE')).toBe(-1);
        expect(getKeywordValue(ugluk, 'DAMAGE', G)).toBe(1);
    });

    it('accorde fierce quand 3 possessions sont spotées', () => {
        const patroller = createMinion({
            id: '10U82',
            instanceId: 'patroller',
            abilities: [fierceWhile],
        });
        const G = createGameState({
            battlefield: [patroller],
            players: {
                '0': createPlayerState('0', {
                    supportArea: [
                        {
                            id: 'p1',
                            instanceId: 'p1',
                            kind: 'FREE_PEOPLE',
                            type: 'POSSESSION',
                            culture: 'SHIRE',
                            set: 1,
                            rarity: 'C',
                            isUnique: false,
                        },
                        {
                            id: 'p2',
                            instanceId: 'p2',
                            kind: 'FREE_PEOPLE',
                            type: 'POSSESSION',
                            culture: 'SHIRE',
                            set: 1,
                            rarity: 'C',
                            isUnique: false,
                        },
                        {
                            id: 'p3',
                            instanceId: 'p3',
                            kind: 'FREE_PEOPLE',
                            type: 'POSSESSION',
                            culture: 'SHIRE',
                            set: 1,
                            rarity: 'C',
                            isUnique: false,
                        },
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(getKeywordValue(patroller, 'FIERCE')).toBe(-1);
        expect(getKeywordValue(patroller, 'FIERCE', G)).toBe(0);
    });
});
