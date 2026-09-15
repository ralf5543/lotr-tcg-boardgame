import { describe, expect, it } from 'vitest';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';
import type { Ability, CardState } from '../types';

describe('While spot → each [classe] strength', () => {
    const nerteaEach: Ability = {
        id: '0P116:0',
        phases: [],
        trigger: {
            type: 'WHILE',
            spot: [{ count: 6, target: [['COMPANION']] }],
        },
        cost: [],
        effects: [
            {
                type: 'MODIFY_STAT',
                stat: 'STRENGTH',
                value: 2,
                target: [['NAZGÛL']],
            },
        ],
        source: 'SELF',
    };

    const unendingLife: Ability = {
        id: '12C181:0',
        phases: [],
        trigger: {
            type: 'WHILE',
            spot: [{ count: 6, target: [['COMPANION']] }],
        },
        cost: [],
        effects: [
            {
                type: 'MODIFY_STAT',
                stat: 'STRENGTH',
                value: 3,
                target: [['NAZGÛL']],
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

    it('booste tous les Nazgûl quand Nertëa spot 6 companions', () => {
        const nertea = createMinion({
            id: '0P116',
            instanceId: 'nertea',
            title: 'Úlairë Nertëa',
            race: 'NAZGÛL',
            strength: 9,
            abilities: [nerteaEach],
        });
        const other = createMinion({
            id: '1R221',
            instanceId: 'other-nazgul',
            race: 'NAZGÛL',
            strength: 10,
        });
        const orc = createMinion({
            id: 'orc',
            instanceId: 'orc',
            race: 'ORC',
            strength: 8,
        });

        const G = createGameState({
            battlefield: [nertea, other, orc],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: sixCompanions(),
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(getCalculatedStrength(G, nertea)).toBe(11);
        expect(getCalculatedStrength(G, other)).toBe(12);
        expect(getCalculatedStrength(G, orc)).toBe(8);
    });

    it('condition support area : Unending Life buffe les Nazgûl', () => {
        const condition: CardState = {
            id: '12C181',
            instanceId: 'unending',
            kind: 'SHADOW',
            type: 'CONDITION',
            culture: 'WRAITH',
            set: 12,
            rarity: 'C',
            isUnique: false,
            abilities: [unendingLife],
        };
        const nazgul = createMinion({
            id: 'nazgul',
            instanceId: 'nazgul',
            race: 'NAZGÛL',
            strength: 9,
        });

        const withSpot = createGameState({
            battlefield: [nazgul],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: sixCompanions(),
                }),
                '1': createPlayerState('1', { supportArea: [condition] }),
            },
        });
        expect(getCalculatedStrength(withSpot, nazgul)).toBe(12);

        const withoutSpot = createGameState({
            battlefield: [nazgul],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: sixCompanions().slice(0, 5),
                }),
                '1': createPlayerState('1', { supportArea: [condition] }),
            },
        });
        expect(getCalculatedStrength(withoutSpot, nazgul)).toBe(9);
    });
});
