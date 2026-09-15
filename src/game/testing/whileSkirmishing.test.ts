import { describe, expect, it } from 'vitest';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';
import type { Ability } from '../types';

describe('While skirmishing → strength', () => {
    const arwenAbility: Ability = {
        id: '1R30:0',
        phases: [],
        trigger: {
            type: 'WHILE',
            skirmishing: { target: [['NAZGÛL']] },
        },
        cost: [],
        effects: [
            {
                type: 'MODIFY_STAT',
                stat: 'STRENGTH',
                value: 3,
                target: 'SELF',
            },
        ],
        source: 'SELF',
    };

    it('booste Arwen seulement contre un Nazgûl en escarmouche', () => {
        const arwen = createCompanion({
            id: '1R30',
            instanceId: 'arwen',
            title: 'Arwen',
            strength: 6,
            abilities: [arwenAbility],
        });
        const nazgul = createMinion({
            id: 'nazgul',
            instanceId: 'nazgul',
            race: 'NAZGÛL',
            culture: 'WRAITH',
            strength: 10,
        });
        const orc = createMinion({
            id: 'orc',
            instanceId: 'orc',
            race: 'ORC',
            strength: 5,
        });

        const vsNazgul = createGameState({
            activeSkirmishId: 'sk-1',
            skirmishes: [
                {
                    id: 'sk-1',
                    companionId: 'arwen',
                    minionIds: ['nazgul'],
                },
            ],
            battlefield: [nazgul],
            players: {
                '0': createPlayerState('0', { fellowshipArea: [arwen] }),
                '1': createPlayerState('1'),
            },
        });
        expect(getCalculatedStrength(vsNazgul, arwen)).toBe(9);

        const vsOrc = createGameState({
            activeSkirmishId: 'sk-2',
            skirmishes: [
                {
                    id: 'sk-2',
                    companionId: 'arwen',
                    minionIds: ['orc'],
                },
            ],
            battlefield: [orc],
            players: {
                '0': createPlayerState('0', { fellowshipArea: [arwen] }),
                '1': createPlayerState('1'),
            },
        });
        expect(getCalculatedStrength(vsOrc, arwen)).toBe(6);
    });
});
