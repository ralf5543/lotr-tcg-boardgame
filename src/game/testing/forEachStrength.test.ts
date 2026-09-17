import { describe, expect, it } from 'vitest';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';
import type { Ability } from '../types';

const gandalfRaces: Ability = {
    id: '1R72:0',
    phases: [],
    trigger: { type: 'WHILE' },
    cost: [],
    effects: [
        {
            type: 'MODIFY_STAT',
            stat: 'STRENGTH',
            value: 1,
            target: 'SELF',
            perDistinctRace: {
                races: ['HOBBIT', 'DWARF', 'ELF', 'MAN'],
                inFellowship: true,
            },
        },
    ],
    source: 'SELF',
};

describe('For each races → strength (Gandalf 1R72)', () => {
    it('compte les races distinctes en compagnie', () => {
        const gandalf = createCompanion({
            id: '1R72',
            instanceId: 'gandalf',
            title: 'Gandalf',
            strength: 7,
            race: 'WIZARD',
            culture: 'GANDALF',
            abilities: [gandalfRaces],
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            race: 'HOBBIT',
                        }),
                        createCompanion({
                            id: 'gimli',
                            race: 'DWARF',
                        }),
                        createCompanion({
                            id: 'legolas',
                            race: 'ELF',
                        }),
                        gandalf,
                    ],
                }),
            },
            fpPlayerId: '0',
        });

        // Hobbit + Dwarf + Elf = 3 (pas de Man)
        expect(getCalculatedStrength(G, gandalf)).toBe(10);
    });

    it('sans races listées → pas de bonus', () => {
        const gandalf = createCompanion({
            id: '1R72',
            instanceId: 'gandalf',
            title: 'Gandalf',
            strength: 7,
            race: 'WIZARD',
            abilities: [gandalfRaces],
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        gandalf,
                        createCompanion({
                            id: 'quickbeam',
                            race: 'ENT',
                            culture: 'GANDALF',
                        }),
                    ],
                }),
            },
            fpPlayerId: '0',
        });

        expect(getCalculatedStrength(G, gandalf)).toBe(7);
    });
});
