import { describe, expect, it } from 'vitest';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';
import type { Ability, CardState } from '../types';

describe('While spot → each [classe] keyword', () => {
    const ragingFierce: Ability = {
        id: '11S97:0',
        phases: [],
        trigger: {
            type: 'WHILE',
            spot: [{ count: 6, target: [['COMPANION']] }],
        },
        cost: [],
        effects: [
            {
                type: 'MODIFY_KEYWORD',
                keyword: 'FIERCE',
                target: [['MEN', 'MINION']],
            },
        ],
        source: 'SELF',
    };

    const shingleDamage: Ability = {
        id: '12C145:0',
        phases: [],
        trigger: {
            type: 'WHILE',
            spot: [{ count: 6, target: [['COMPANION']] }],
        },
        cost: [],
        effects: [
            {
                type: 'MODIFY_KEYWORD',
                keyword: 'DAMAGE +1',
                target: [['URUK-HAI', 'MINION']],
            },
        ],
        source: 'SELF',
    };

    function sixCompanions(): CardState[] {
        return [1, 2, 3, 4, 5, 6].map((n) =>
            createCompanion({
                id: `comp-${n}`,
                instanceId: `comp-${n}`,
                strength: 3,
            })
        );
    }

    it('accorde fierce à tous les Men minions via Raging Dunlending', () => {
        const raging = createMinion({
            id: '11S97',
            instanceId: 'raging',
            culture: 'MEN',
            race: 'MAN',
            abilities: [ragingFierce],
        });
        const otherMen = createMinion({
            id: 'other-men',
            instanceId: 'other-men',
            culture: 'MEN',
            race: 'MAN',
        });
        const orc = createMinion({
            id: 'orc',
            instanceId: 'orc',
            culture: 'ORC',
            race: 'ORC',
        });

        const G = createGameState({
            battlefield: [raging, otherMen, orc],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: sixCompanions(),
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(getKeywordValue(raging, 'FIERCE', G)).toBe(0);
        expect(getKeywordValue(otherMen, 'FIERCE', G)).toBe(0);
        expect(getKeywordValue(orc, 'FIERCE', G)).toBe(-1);
    });

    it('condition support : Shingle donne Damage +1 aux Uruk-hai', () => {
        const condition: CardState = {
            id: '12C145',
            instanceId: 'shingle',
            kind: 'SHADOW',
            type: 'CONDITION',
            culture: 'URUK-HAI',
            set: 12,
            rarity: 'C',
            isUnique: false,
            abilities: [shingleDamage],
        };
        const uruk = createMinion({
            id: 'uruk',
            instanceId: 'uruk',
            culture: 'URUK-HAI',
            race: 'URUK-HAI',
        });
        const orc = createMinion({
            id: 'orc',
            instanceId: 'orc',
            culture: 'ORC',
            race: 'ORC',
        });

        const withSpot = createGameState({
            battlefield: [uruk, orc],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: sixCompanions(),
                }),
                '1': createPlayerState('1', { supportArea: [condition] }),
            },
        });
        expect(getKeywordValue(uruk, 'DAMAGE', withSpot)).toBe(1);
        expect(getKeywordValue(orc, 'DAMAGE', withSpot)).toBe(-1);

        const withoutSpot = createGameState({
            battlefield: [uruk],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: sixCompanions().slice(0, 5),
                }),
                '1': createPlayerState('1', { supportArea: [condition] }),
            },
        });
        expect(getKeywordValue(uruk, 'DAMAGE', withoutSpot)).toBe(-1);
    });
});
