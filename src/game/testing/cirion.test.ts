import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';
import type { Ability, CardState } from '../types';

const TEXT =
    'While you have only 4 or 5 cards in hand, Cirion is strength +2.';

const cirionAbility: Ability = {
    id: '7C82:0',
    phases: [],
    trigger: { type: 'WHILE', handSizeBetween: { min: 4, max: 5 } },
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

function makeCirion(baseStrength = 6): CardState {
    return createCompanion({
        id: '7C82',
        instanceId: 'cirion',
        title: 'Cirion',
        culture: 'GONDOR',
        race: 'MAN',
        strength: baseStrength,
        abilities: [cirionAbility],
    });
}

function filler(n: number): CardState[] {
    return Array.from({ length: n }, (_, i) =>
        createCompanion({
            id: `h${i}`,
            instanceId: `h${i}`,
            type: 'EVENT',
            kind: 'FREE_PEOPLE',
        })
    );
}

describe('Cirion (7C82)', () => {
    it('parse : 4 ou 5 en main → force +2', () => {
        expect(parseAbilities(TEXT, 'Cirion', '7C82')?.[0]).toMatchObject({
            trigger: { type: 'WHILE', handSizeBetween: { min: 4, max: 5 } },
            effects: [
                {
                    type: 'MODIFY_STAT',
                    stat: 'STRENGTH',
                    value: 2,
                    target: 'SELF',
                },
            ],
        });
    });

    it('cartes.json : ability alignée', () => {
        const card = getCardById('7C82')!;
        expect(card.abilities?.[0]).toMatchObject({
            trigger: { type: 'WHILE', handSizeBetween: { min: 4, max: 5 } },
            effects: [
                {
                    type: 'MODIFY_STAT',
                    stat: 'STRENGTH',
                    value: 2,
                    target: 'SELF',
                },
            ],
        });
    });

    it.each([4, 5])('force +2 avec %i cartes en main', (n) => {
        const cirion = makeCirion(6);
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [cirion],
                    hand: filler(n),
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(getCalculatedStrength(G, cirion)).toBe(8);
    });

    it.each([0, 3, 6])('pas de bonus avec %i cartes en main', (n) => {
        const cirion = makeCirion(6);
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [cirion],
                    hand: filler(n),
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(getCalculatedStrength(G, cirion)).toBe(6);
    });
});
