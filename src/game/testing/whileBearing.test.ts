import { describe, expect, it } from 'vitest';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';
import type { Ability } from '../types';

describe('While bearing → strength / keyword', () => {
    const merryAbility: Ability = {
        id: '1C303:0',
        phases: [],
        trigger: { type: 'WHILE', bearing: { target: [['WEAPON']] } },
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

    it('booste Merry s’il porte une arme', () => {
        const weapon = createCard({
            id: 'sword',
            instanceId: 'sword',
            kind: 'FREE_PEOPLE',
            type: 'POSSESSION',
            subtype: 'HAND-WEAPON',
        });
        const merry = createCompanion({
            id: '1C303',
            instanceId: 'merry',
            title: 'Merry',
            strength: 3,
            abilities: [merryAbility],
            attachments: [weapon],
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', { fellowshipArea: [merry] }),
                '1': createPlayerState('1'),
            },
        });
        expect(getCalculatedStrength(G, merry)).toBe(5);
    });

    it('accorde fierce si possession portée', () => {
        const ability: Ability = {
            id: '12S65:0',
            phases: [],
            trigger: {
                type: 'WHILE',
                bearing: { target: [['POSSESSION']] },
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
        const possession = createCard({
            id: 'axe',
            instanceId: 'axe',
            kind: 'SHADOW',
            type: 'POSSESSION',
        });
        const minion = createMinion({
            id: '12S65',
            instanceId: 'dunlending',
            abilities: [ability],
            attachments: [possession],
        });
        const G = createGameState({
            battlefield: [minion],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1'),
            },
        });
        expect(getKeywordValue(minion, 'FIERCE', G)).toBe(0);
    });
});
