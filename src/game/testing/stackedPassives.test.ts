import { describe, expect, it } from 'vitest';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import { getEffectiveTwilightCost } from '../../utils/roamingDetection';
import { getWhileTwilightCostModifier } from '../logic/stats/mechanics/whileModifier';
import {
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';
import type { Ability } from '../types';

const pillagerWhile: Ability = {
    id: '7C275:0',
    phases: [],
    trigger: { type: 'WHILE', stackedOnControlledSite: true },
    cost: [],
    effects: [
        {
            type: 'MODIFY_KEYWORD',
            keyword: 'FIERCE',
            target: [['BESIEGER']],
        },
    ],
    source: 'SELF',
};

const ologTwilight: Ability = {
    id: '8R105:twilight',
    phases: [],
    trigger: { type: 'WHILE' },
    cost: [],
    effects: [
        {
            type: 'MODIFY_STAT',
            stat: 'TWILIGHT_COST',
            value: -2,
            target: 'SELF',
            perSpot: {
                target: [['SAURON', 'MINION']],
                stackedOnSites: true,
            },
        },
    ],
    source: 'SELF',
};

describe('passifs empilés (Pillager / Olog crépuscule)', () => {
    it('Pillager empilé sur site contrôlé → besiegers en jeu sont fierce', () => {
        const pillager = createMinion({
            id: '7C275',
            instanceId: 'pillager',
            culture: 'SAURON',
            race: 'ORC',
            keywords: ['BESIEGER'],
            abilities: [pillagerWhile],
        });
        const besieger = createMinion({
            id: '4C180',
            instanceId: 'besieger',
            culture: 'ISENGARD',
            race: 'URUK-HAI',
            keywords: ['BESIEGER'],
        });
        const plain = createMinion({
            id: 'orc',
            instanceId: 'plain',
            culture: 'SAURON',
            race: 'ORC',
        });
        const site = createSite({
            id: 's1',
            instanceId: 's1',
            siteNumber: 1,
            ownerId: '0',
            controlledBy: '1',
        });
        site.stacked = [pillager];

        const G = createGameState({
            fpPlayerId: '0',
            path: [site, null, null, null, null, null, null, null, null],
            battlefield: [besieger, plain],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1'),
            },
        });

        expect(getKeywordValue(besieger, 'FIERCE', G)).toBe(0);
        expect(getKeywordValue(plain, 'FIERCE', G)).toBe(-1);
    });

    it('Pillager non empilé / site non contrôlé → pas de fierce', () => {
        const pillager = createMinion({
            id: '7C275',
            instanceId: 'pillager',
            keywords: ['BESIEGER'],
            abilities: [pillagerWhile],
        });
        const besieger = createMinion({
            id: '4C180',
            instanceId: 'besieger',
            keywords: ['BESIEGER'],
        });
        const site = createSite({
            id: 's1',
            instanceId: 's1',
            siteNumber: 1,
            ownerId: '0',
        });
        site.stacked = [pillager];

        const G = createGameState({
            path: [site, null, null, null, null, null, null, null, null],
            battlefield: [besieger],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1'),
            },
        });

        expect(getKeywordValue(besieger, 'FIERCE', G)).toBe(-1);
    });

    it('Olog : −2 crépuscule par séide Sauron empilé', () => {
        const olog = createMinion({
            id: '8R105',
            instanceId: 'olog',
            twilightCost: 10,
            minionSiteNumber: 1,
            culture: 'SAURON',
            race: 'TROLL',
            abilities: [ologTwilight],
        });
        const stacked = createMinion({
            id: '7C273',
            instanceId: 'garrison',
            culture: 'SAURON',
            race: 'ORC',
            type: 'MINION',
        });
        const site = createSite({
            id: 's1',
            instanceId: 's1',
            siteNumber: 1,
            ownerId: '0',
            controlledBy: '1',
        });
        site.stacked = [stacked, { ...stacked, instanceId: 'garrison-2' }];

        const G = createGameState({
            currentSiteIndex: 3,
            path: [site, null, null, null, null, null, null, null, null],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 3 }),
                '1': createPlayerState('1', { currentSiteIndex: 3 }),
            },
        });

        expect(getWhileTwilightCostModifier(G, olog)).toBe(-4);
        expect(getEffectiveTwilightCost(olog, 3, -4)).toBe(6);
    });
});
