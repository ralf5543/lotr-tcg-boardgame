import { describe, expect, it } from 'vitest';
import { formatAbilityLabelParts } from '../engine/abilities/collectAbilities';
import { payAbilityCost } from '../engine/abilities/payAbilityCost';
import type { Ability } from '../types';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

const LEGOLAS_ABILITY: Ability = {
    id: '15S18:0',
    phases: ['REGROUP'],
    cost: [
        {
            exert: [
                {
                    count: 2,
                    target: [['HUNTER', 'COMPANION']],
                    mode: 'DESIGNATION',
                    distinctTargets: true,
                },
            ],
        },
    ],
    effects: [{ type: 'DRAW', count: 1 }],
    source: 'SELF',
    text: 'REGROUP: Exert 2 hunter companions to draw a card',
};

describe('coût exert distinct (Legolas)', () => {
    it('libellé : Affaiblir 2 … — pas « 2 fois »', () => {
        const legolas = createCompanion({
            id: '15S18',
            title: 'Legolas',
            keywords: ['HUNTER 1'],
        });
        expect(formatAbilityLabelParts(LEGOLAS_ABILITY, legolas)).toEqual({
            cost: expect.stringMatching(/^Affaiblir 2 /),
            effect: 'piocher 1 carte',
        });
        expect(formatAbilityLabelParts(LEGOLAS_ABILITY, legolas).cost).not.toMatch(
            /fois/
        );
    });

    it('paie en affaiblissant deux chasseurs distincts une fois chacun', () => {
        const legolas = createCompanion({
            id: '15S18',
            instanceId: 'legolas-1',
            title: 'Legolas',
            keywords: ['HUNTER 1'],
            vitality: 3,
            wounds: 0,
        });
        const other = createCompanion({
            id: '17S7',
            instanceId: 'hunter-2',
            title: 'Elven Guardian',
            keywords: ['HUNTER 1'],
            vitality: 3,
            wounds: 0,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [legolas, other],
                    deck: [
                        createCompanion({ id: 'draw-1', instanceId: 'draw-1' }),
                    ],
                }),
            },
        });

        expect(
            payAbilityCost(
                G,
                legolas,
                LEGOLAS_ABILITY.cost,
                ['legolas-1', 'hunter-2'],
                undefined,
                undefined,
                '0'
            )
        ).toBe(true);
        expect(G.players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(G.players['0']?.fellowshipArea[1]?.wounds).toBe(1);
    });
});
