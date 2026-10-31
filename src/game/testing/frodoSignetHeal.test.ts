import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    abilityNeedsCostDesignation,
    getCostDesignationCandidates,
} from '../engine/abilities/designation';
import { canPayAbilityCost, payAbilityCost } from '../engine/abilities/payAbilityCost';
import type { Ability } from '../types';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    '<keyword>Ring-bearer (resistance 10).</keyword>  <br><keyword>Fellowship:</keyword> Exert another companion who has the Frodo signet to heal Frodo.';

describe('Frodo 1C290 — sceau Frodon → soigner', () => {
    it('analyse : affaiblir autre compagnon SIGNET_FRODO → HEAL SELF', () => {
        expect(parseAbilities(CSV_TEXT, 'Frodo', '1C290')).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['FELLOWSHIP'],
                    cost: [
                        {
                            exert: [
                                {
                                    count: 1,
                                    target: [['COMPANION', 'SIGNET_FRODO']],
                                    mode: 'DESIGNATION',
                                    excludeSource: true,
                                },
                            ],
                        },
                    ],
                    effects: [{ type: 'HEAL', count: 1, target: 'SELF' }],
                }),
            ])
        );
        expect(
            getCardById('1C290')?.abilities?.some(
                (ab) =>
                    ab.cost?.[0]?.exert?.[0]?.excludeSource === true &&
                    (ab.effects || []).some(
                        (e) => e.type === 'HEAL' && e.target === 'SELF'
                    )
            )
        ).toBe(true);
    });

    it('runtime : affaiblit le compagnon au sceau, soigne Frodon (pas lui-même)', () => {
        const frodo = createCompanion({
            id: '1C290',
            instanceId: 'frodo',
            title: 'Frodo',
            signet: 'FRODO',
            wounds: 1,
            vitality: 3,
            abilities: getCardById('1C290')?.abilities,
        });
        const ability = frodo.abilities![0] as Ability;
        const sam = createCompanion({
            id: '1R310',
            instanceId: 'sam',
            title: 'Sam',
            signet: 'FRODO',
            vitality: 3,
        });
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, sam],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(abilityNeedsCostDesignation(G, frodo, ability)).toBe(true);
        const candidates = getCostDesignationCandidates(G, frodo, ability);
        expect(candidates.map((c) => c.instanceId)).toEqual(['sam']);
        expect(canPayAbilityCost(G, frodo, ability.cost)).toBe(true);
        expect(payAbilityCost(G, frodo, ability.cost, 'sam')).toBe(true);
        expect(sam.wounds).toBe(1);
        expect(applyAbilityEffect(G, frodo, ability)).toBe(true);
        expect(frodo.wounds).toBe(0);
    });
});
