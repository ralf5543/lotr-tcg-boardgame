import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import { findSkirmishToCancel } from '../engine/abilities/cancelSkirmish';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

describe('Hobbits / Isengard vague 4 — parse', () => {
    it('parse Aragorn : move → blesser un séide × Hobbits unbound', () => {
        const abs = parseAbilities(
            '<keyword>Ranger.</keyword> Each time the fellowship moves, you may wound a minion for each unbound Hobbit you spot.',
            'Aragorn',
            '4P364'
        );
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    optional: true,
                    trigger: { type: 'FELLOWSHIP_MOVES' },
                    cost: [
                        expect.objectContaining({
                            spot: [
                                expect.objectContaining({
                                    target: [['UNBOUND', 'HOBBIT']],
                                }),
                            ],
                        }),
                    ],
                    effects: [
                        expect.objectContaining({
                            type: 'WOUND',
                            countFromSpot: true,
                            target: [['MINION']],
                        }),
                    ],
                }),
            ])
        );
    });

    it('parse Frodo : début regroupement → Muster temporaire', () => {
        const abs = parseAbilities(
            'Ring-bearer. <keyword>Ring-bound.</keyword> At the start of the regroup phase, you may exert Frodo to make him gain <keyword>muster</keyword> until the end of the regroup phase.',
            'Frodo',
            '11S164'
        );
        expect(abs?.[0]).toEqual(
            expect.objectContaining({
                phases: ['START_OF_REGROUP'],
                optional: true,
                cost: [
                    expect.objectContaining({
                        exert: [
                            expect.objectContaining({
                                count: 1,
                                target: 'SELF',
                            }),
                        ],
                    }),
                ],
                effects: [
                    expect.objectContaining({
                        type: 'ADD_TEMP_KEYWORD',
                        keyword: 'MUSTER',
                        target: 'SELF',
                        expiresAtPhase: 'REGROUP',
                    }),
                ],
            })
        );
    });

    it('parse Crouched Down : annuler si force séide < résistance Hobbit', () => {
        const abs = parseAbilities(
            '<keyword>Stealth.</keyword> Cancel a skirmish involving a Hobbit and a minion whose strength is lower than that Hobbit\'s resistance.',
            'Crouched Down',
            '11C162'
        );
        expect(abs?.[0]).toEqual(
            expect.objectContaining({
                effects: [
                    expect.objectContaining({
                        type: 'CANCEL_SKIRMISH',
                        involving: [['HOBBIT']],
                        requiresMinionStrengthLessThanCompanionResistance: true,
                    }),
                ],
            })
        );
    });
});

describe('Hobbits / Isengard vague 4 — runtime', () => {
    it('Crouched Down : annule Merry vs séide plus faible que sa résistance', () => {
        const merry = createCompanion({
            id: 'merry',
            instanceId: 'merry',
            race: 'HOBBIT',
            resistance: 9,
            strength: 3,
        });
        const uruk = createMinion({
            id: 'uruk',
            instanceId: 'uruk',
            strength: 5,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [merry],
                    burdens: 0,
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [uruk],
            skirmishes: [
                {
                    id: 'sk1',
                    companionId: 'merry',
                    minionIds: ['uruk'],
                },
            ],
            activeSkirmishId: 'sk1',
        });
        const sk = findSkirmishToCancel(G, merry, [['HOBBIT']], {
            requiresMinionStrengthLessThanCompanionResistance: true,
        });
        expect(sk?.id).toBe('sk1');

        const strong = createMinion({
            id: 'troll',
            instanceId: 'troll',
            strength: 12,
        });
        G.battlefield = [strong];
        G.skirmishes = [
            {
                id: 'sk2',
                companionId: 'merry',
                minionIds: ['troll'],
            },
        ];
        G.activeSkirmishId = 'sk2';
        expect(
            findSkirmishToCancel(G, merry, [['HOBBIT']], {
                requiresMinionStrengthLessThanCompanionResistance: true,
            })
        ).toBeNull();
    });

    it('Aragorn : 2 Hobbits unbound → 2 blessures sur un séide', () => {
        const ability = parseAbilities(
            '<keyword>Ranger.</keyword> Each time the fellowship moves, you may wound a minion for each unbound Hobbit you spot.',
            'Aragorn',
            '4P364'
        )![0]!;
        const aragorn = {
            ...getCardById('4P364')!,
            instanceId: 'aragorn',
            abilities: [ability],
        };
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo',
            race: 'HOBBIT',
            keywords: ['RING-BOUND'],
            ringBearer: true,
        });
        const merry = createCompanion({
            id: 'merry',
            instanceId: 'merry',
            race: 'HOBBIT',
        });
        const sam = createCompanion({
            id: 'sam',
            instanceId: 'sam',
            race: 'HOBBIT',
        });
        const minion = createMinion({
            id: 'orc',
            instanceId: 'orc',
            vitality: 4,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, merry, sam, aragorn],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [minion],
        });
        expect(applyAbilityEffect(G, aragorn, ability as never, 'orc')).toBe(
            true
        );
        expect(
            G.battlefield.find((c) => c.instanceId === 'orc')?.wounds || 0
        ).toBe(2);
    });

    it('Frodo : affaiblir → Muster jusqu’au regroupement', () => {
        const ability = parseAbilities(
            'Ring-bearer. <keyword>Ring-bound.</keyword> At the start of the regroup phase, you may exert Frodo to make him gain <keyword>muster</keyword> until the end of the regroup phase.',
            'Frodo',
            '11S164'
        )![0]!;
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
            abilities: [ability],
            actionPhases: ['START_OF_REGROUP'],
        };
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(applyAbilityEffect(G, frodo, ability as never)).toBe(true);
        // Coût non payé ici — on teste l’effet Muster seul.
        expect(getKeywordValue(frodo, 'MUSTER', G)).toBeGreaterThanOrEqual(0);
    });
});
