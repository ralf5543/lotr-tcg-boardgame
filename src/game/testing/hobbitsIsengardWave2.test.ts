import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { getEffectiveStrength } from '../../utils/cardStats';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { applyEventAbility } from '../engine/abilities/playEventAbility';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';
import { createEngineClient } from './createEngineClient';

describe('Hobbits / Isengard vague 2 — parse', () => {
    it('parse Salt : discard → remove burden + anti-submersion porteur unbound', () => {
        const abs = parseAbilities(
            'Bearer must be a Hobbit. <br><keyword>Fellowship:</keyword> Discard this possession to remove a burden. <keyword>Skirmish:</keyword> If bearer is an unbound Hobbit, discard this possession to prevent him or her from being overwhelmed unless his or her strength is tripled.',
            'Salt from the Shire',
            '11R171'
        );
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['FELLOWSHIP'],
                    effects: [
                        expect.objectContaining({
                            type: 'REMOVE_BURDENS',
                            count: 1,
                        }),
                    ],
                }),
                expect.objectContaining({
                    phases: ['SKIRMISH'],
                    requiresBearerFilters: [['UNBOUND', 'HOBBIT']],
                    effects: [
                        expect.objectContaining({
                            type: 'SET_OVERWHELM_FACTOR',
                            target: 'BEARER',
                            factor: 3,
                        }),
                    ],
                }),
            ])
        );
    });

    it('parse Men Will Fall : Spot Saruman or isengard Man → unbound −2', () => {
        const abs = parseAbilities(
            '<keyword>Skirmish: </keyword>Spot Saruman or an <symbol>isengard</symbol> Man to make an unbound companion strength -2.',
            'Men Will Fall',
            '4U161'
        );
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['SKIRMISH'],
                    cost: [
                        expect.objectContaining({
                            spot: [
                                expect.objectContaining({
                                    target: [
                                        ['Saruman'],
                                        ['ISENGARD', 'MAN'],
                                    ],
                                }),
                            ],
                        }),
                    ],
                    effects: [
                        expect.objectContaining({
                            type: 'ADD_TEMP_STAT',
                            stat: 'STRENGTH',
                            value: -2,
                            target: [['UNBOUND', 'COMPANION']],
                        }),
                    ],
                }),
            ])
        );
    });

    it('parse Sworn Companion : +1 par compagnon résistance ≥7', () => {
        const abs = parseAbilities(
            'Make a Hobbit strength +1 for each companion who has resistance 7 or more.',
            'Sworn Companion',
            '11S174'
        );
        expect(abs?.[0]).toEqual(
            expect.objectContaining({
                effects: [
                    expect.objectContaining({
                        type: 'ADD_TEMP_STAT',
                        value: 1,
                        target: [['HOBBIT']],
                        perSpot: {
                            target: [['COMPANION']],
                            minResistance: 7,
                        },
                    }),
                ],
            })
        );
    });

    it('parse Chance Observation : 4+ shire défausse + per Hobbit', () => {
        const abs = parseAbilities(
            'If there are 4 or more <symbol>shire</symbol> cards in your discard pile, make a Hobbit strength +1 for each Hobbit you can spot.',
            'Chance Observation',
            '10C106'
        );
        expect(abs?.[0]).toEqual(
            expect.objectContaining({
                requiresDiscardMatching: {
                    count: 4,
                    target: [['SHIRE']],
                },
                effects: [
                    expect.objectContaining({
                        type: 'ADD_TEMP_STAT',
                        value: 1,
                        target: [['HOBBIT']],
                        perSpot: { target: [['HOBBIT']] },
                    }),
                ],
            })
        );
    });

    it('parse Agents of Orthanc : +2 / Damage +1 par culture FP over 2', () => {
        const abs = parseAbilities(
            'This minion is strength +2 and <keyword>Damage +1.</keyword> for each Free Peoples culture that you can spot over 2.',
            'Agents of Orthanc',
            '6R57'
        );
        expect(abs?.[0]).toEqual(
            expect.objectContaining({
                trigger: { type: 'WHILE' },
                effects: expect.arrayContaining([
                    expect.objectContaining({
                        type: 'MODIFY_STAT',
                        value: 2,
                        perDistinctFpCultureOver: 2,
                    }),
                    expect.objectContaining({
                        type: 'MODIFY_KEYWORD',
                        keyword: 'DAMAGE +1',
                        perDistinctFpCultureOver: 2,
                    }),
                ]),
            })
        );
    });
});

describe('Hobbits / Isengard vague 2 — runtime', () => {
    it('Sworn Companion : +1 par compagnon résistance ≥7 après ciblage', () => {
        const sworn = {
            ...getCardById('11S174')!,
            instanceId: 'sworn',
        };
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo',
            title: 'Frodo',
            race: 'HOBBIT',
            resistance: 10,
            ringBearer: true,
            strength: 3,
        });
        const sam = createCompanion({
            id: 'sam',
            instanceId: 'sam',
            title: 'Sam',
            race: 'HOBBIT',
            resistance: 10,
            strength: 3,
        });
        const low = createCompanion({
            id: 'low',
            instanceId: 'low',
            title: 'Weak',
            race: 'HOBBIT',
            resistance: 4,
            strength: 3,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, sam, low],
                    burdens: 0,
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(applyEventAbility(G, sworn, 'skirmish', 'low')).toBe(true);
        // Frodo + Sam (≥7) → +2 ; Weak lui-même <7 → pas compté
        expect(getEffectiveStrength(low, G)).toBe(5);
    });

    it('Agents : 3 cultures FP → +2 force et Damage +1', () => {
        const agentsCard = getCardById('6R57')!;
        const agents = createMinion({
            ...agentsCard,
            instanceId: 'agents',
            strength: 6,
        });
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo',
            culture: 'SHIRE',
            ringBearer: true,
        });
        const aragorn = createCompanion({
            id: 'aragorn',
            instanceId: 'aragorn',
            culture: 'GONDOR',
            title: 'Aragorn',
        });
        const radagast = createCompanion({
            id: 'radagast',
            instanceId: 'radagast',
            culture: 'GANDALF',
            title: 'Radagast',
        });
        const engine = createEngineClient({
            startPhase: 'skirmish',
            G: {
                battlefield: [agents],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, aragorn, radagast],
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });
        const G = engine.getG();
        const live = G.battlefield.find((c) => c.instanceId === 'agents')!;
        expect(getEffectiveStrength(live, G)).toBe(
            (Number(live.strength) || 0) + 2
        );
        expect(getKeywordValue(live, 'DAMAGE', G)).toBe(1);
    });
});
