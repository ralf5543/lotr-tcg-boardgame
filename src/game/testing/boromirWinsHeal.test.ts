import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { playerHasEligibleResponse } from '../engine/responseWindow';
import type { Ability } from '../types';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

const TEXT =
    '**Knight.** Each time Boromir wins a skirmish, you may heal a <symbol>gondor</symbol> companion.';

const ABILITY: Ability = {
    id: '11R57:0:wins-heal',
    phases: ['RESPONSE'],
    trigger: { type: 'WINS_SKIRMISH', winner: 'SELF' },
    optional: true,
    cost: [],
    effects: [
        { type: 'HEAL', count: 1, target: [['GONDOR', 'COMPANION']] },
    ],
    source: 'SELF',
    text: 'Each time Boromir wins a skirmish, you may heal a Gondor companion.',
};

describe('Boromir 11R57 — gagne une escarmouche → soigner', () => {
    it('analyse : réponse optionnelle, soin d’un compagnon du Gondor', () => {
        expect(parseAbilities(TEXT, 'Boromir', '11R57')).toEqual([
            expect.objectContaining({
                phases: ['RESPONSE'],
                optional: true,
                trigger: { type: 'WINS_SKIRMISH', winner: 'SELF' },
                effects: [
                    {
                        type: 'HEAL',
                        count: 1,
                        target: [['GONDOR', 'COMPANION']],
                    },
                ],
            }),
        ]);
    });

    it('variante à alternative (Legolas) : reste inerte plutôt que fausse', () => {
        expect(
            parseAbilities(
                '**Archer.** Each time Legolas wins a skirmish, you may heal a Dwarf companion or another Elf companion.',
                'Legolas',
                '5P121'
            ) ?? []
        ).toEqual([]);
    });

    it('réponse éligible après victoire, puis soigne le compagnon désigné', () => {
        const boromir = createCompanion({
            id: 'boromir',
            title: 'Boromir',
            keywords: ['KNIGHT'],
            abilities: [ABILITY],
        });
        const aragorn = createCompanion({
            id: 'aragorn',
            title: 'Aragorn',
            wounds: 2,
        });
        const gimli = createCompanion({
            id: 'gimli',
            title: 'Gimli',
            culture: 'DWARVEN',
            wounds: 1,
        });
        const G = createGameState({
            pendingEvent: {
                type: 'WINS_SKIRMISH',
                winnerIds: ['boromir'],
            },
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [boromir, aragorn, gimli],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(playerHasEligibleResponse(G, '0')).toBe(true);
        expect(applyAbilityEffect(G, boromir, ABILITY, 'aragorn')).toBe(
            true
        );
        expect(aragorn.wounds).toBe(1);
        // Gimli n’est pas du Gondor : désignation refusée.
        expect(applyAbilityEffect(G, boromir, ABILITY, 'gimli')).toBe(false);
        expect(gimli.wounds).toBe(1);
    });

    it('aucune réponse éligible si aucun compagnon du Gondor n’est blessé', () => {
        const boromir = createCompanion({
            id: 'boromir',
            title: 'Boromir',
            keywords: ['KNIGHT'],
            abilities: [ABILITY],
        });
        const G = createGameState({
            pendingEvent: {
                type: 'WINS_SKIRMISH',
                winnerIds: ['boromir'],
            },
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [boromir],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(playerHasEligibleResponse(G, '0')).toBe(false);
    });
});
