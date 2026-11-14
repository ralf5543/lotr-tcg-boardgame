import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyStartOfSkirmishTriggers } from '../engine/abilities/startOfSkirmish';
import { announceInitiativeIfChanged } from '../logic/initiative';
import { acceptPendingWhenPlayed } from '../engine/abilities/whenPlayed';
import { cardMatchesTarget } from '../engine/validations/matchers';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createCard,
} from './createGameState';

describe('Hobbits / Isengard vague 5 — parse', () => {
    it('parse Bilbo : début combat → take skirmish event Shire', () => {
        const abs = parseAbilities(
            '**Ring-bound.** At the start of each skirmish involving Bilbo, you may exert him to take a <symbol>shire</symbol> skirmish event into hand from your discard pile.',
            'Bilbo',
            '12R119'
        );
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    optional: true,
                    trigger: {
                        type: 'START_OF_SKIRMISH',
                        involving: 'SELF',
                    },
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
                            type: 'TAKE_FROM_DISCARD',
                            target: [['SHIRE', 'EVENT', 'SKIRMISH']],
                        }),
                    ],
                }),
            ])
        );
    });

    it('parse A Light in His Mind : perdre initiative → retirer fardeau', () => {
        const abs = parseAbilities(
            'Each time you lose initiative, you may spot 2 <symbol>shire</symbol> companions to remove a burden.',
            'A Light in His Mind',
            '10U108'
        );
        expect(abs?.[0]).toEqual(
            expect.objectContaining({
                optional: true,
                trigger: { type: 'LOSE_INITIATIVE' },
                cost: [
                    expect.objectContaining({
                        spot: [
                            expect.objectContaining({
                                count: 2,
                                target: [['SHIRE', 'COMPANION']],
                            }),
                        ],
                    }),
                ],
                effects: [
                    expect.objectContaining({
                        type: 'REMOVE_BURDENS',
                        count: 1,
                    }),
                ],
            })
        );
    });
});

describe('Hobbits / Isengard vague 5 — runtime', () => {
    it('matcher : événement Shire en phase SKIRMISH', () => {
        const crouched = getCardById('11C162');
        expect(crouched).toBeTruthy();
        expect(
            cardMatchesTarget(crouched!, [['SHIRE', 'EVENT', 'SKIRMISH']])
        ).toBe(true);
        const unharmed = getCardById('11S176');
        expect(
            cardMatchesTarget(unharmed!, [['SHIRE', 'EVENT', 'SKIRMISH']])
        ).toBe(false);
    });

    it('Bilbo : toaster début combat puis reprise événement', () => {
        const bilboAbs =
            getCardById('12R119')?.abilities ||
            parseAbilities(
                '**Ring-bound.** At the start of each skirmish involving Bilbo, you may exert him to take a <symbol>shire</symbol> skirmish event into hand from your discard pile.',
                'Bilbo',
                '12R119'
            );
        const bilbo = createCompanion({
            id: '12R119',
            instanceId: 'bilbo',
            title: 'Bilbo',
            culture: 'SHIRE',
            race: 'HOBBIT',
            vitality: 4,
            abilities: bilboAbs as never,
        });
        const uruk = createMinion({
            id: '4C187',
            instanceId: 'uruk',
            title: 'Uruk',
        });
        const crouched = createCard({
            id: '11C162',
            instanceId: 'crouched-disc',
            type: 'EVENT',
            culture: 'SHIRE',
            phases: ['SKIRMISH'],
            kind: 'FREE_PEOPLE',
        });
        const other = createCard({
            id: '11S176',
            instanceId: 'unharmed-disc',
            type: 'EVENT',
            culture: 'SHIRE',
            phases: ['REGROUP'],
            kind: 'FREE_PEOPLE',
        });

        const G = createGameState({
            fpPlayerId: '0',
            activeSkirmishId: 'sk-bilbo',
            skirmishes: [
                {
                    id: 'sk-bilbo',
                    companionId: 'bilbo',
                    minionIds: ['uruk'],
                },
            ],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [bilbo],
                    discard: [crouched, other],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [uruk],
        });

        expect(applyStartOfSkirmishTriggers(G, 'sk-bilbo')).toBe(true);
        expect(G.pendingWhenPlayed?.abilityId).toMatch(/12R119/);

        expect(
            acceptPendingWhenPlayed(G, '0', undefined, 'crouched-disc')
        ).toBe(true);
        expect(bilbo.wounds || 0).toBe(1);
        expect(
            G.players['0']!.hand?.some((c) => c.instanceId === 'crouched-disc')
        ).toBe(true);
        expect(
            G.players['0']!.discard?.some(
                (c) => c.instanceId === 'crouched-disc'
            )
        ).toBe(false);
        expect(
            G.players['0']!.discard?.some(
                (c) => c.instanceId === 'unharmed-disc'
            )
        ).toBe(true);
    });

    it('Light : perte d’initiative → toaster retirer fardeau', () => {
        const lightAbs =
            getCardById('10U108')?.abilities ||
            parseAbilities(
                'Each time you lose initiative, you may spot 2 <symbol>shire</symbol> companions to remove a burden.',
                'A Light in His Mind',
                '10U108'
            );
        const frodo = createCompanion({
            id: '11S164',
            instanceId: 'frodo',
            title: 'Frodo',
            culture: 'SHIRE',
            race: 'HOBBIT',
        });
        const merry = createCompanion({
            id: '11C168',
            instanceId: 'merry',
            title: 'Merry',
            culture: 'SHIRE',
            race: 'HOBBIT',
        });
        const light = createCard({
            id: '10U108',
            instanceId: 'light',
            type: 'CONDITION',
            culture: 'SHIRE',
            kind: 'FREE_PEOPLE',
            abilities: lightAbs as never,
        });

        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    burdens: 2,
                    fellowshipArea: [frodo, merry],
                    supportArea: [light],
                    hand: [
                        createCard({ id: 'h1', type: 'EVENT' }),
                        createCard({ id: 'h2', type: 'EVENT' }),
                        createCard({ id: 'h3', type: 'EVENT' }),
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });

        announceInitiativeIfChanged(G, true);
        expect(G.pendingWhenPlayed?.sourceInstanceId).toBe('light');

        expect(acceptPendingWhenPlayed(G, '0')).toBe(true);
        expect(G.players['0']!.burdens).toBe(1);
    });
});
