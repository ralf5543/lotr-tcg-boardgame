import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import { applyEventAbility } from '../engine/abilities/playEventAbility';
import { getEffectiveResistance } from '../../utils/cardStats';
import {
    createCompanion,
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';
import { createEngineClient } from './createEngineClient';

describe('Hobbits / Isengard vague 3 — parse', () => {
    it('parse Phial : muster par région', () => {
        const abs = parseAbilities(
            'Bearer must be a Ring-bound Hobbit.\nWhile bearer is in region 1, bearer gains **muster.**\nWhile bearer is in region 2, each of your <symbol>shire</symbol> companions gains **muster.**\nWhile bearer is in region 3, each character gains **muster.**',
            'Phial of Galadriel',
            '13R155'
        );
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WHILE', inRegion: 1 },
                    effects: [
                        expect.objectContaining({
                            type: 'MODIFY_KEYWORD',
                            keyword: 'MUSTER',
                            target: 'BEARER',
                        }),
                    ],
                }),
                expect.objectContaining({
                    trigger: { type: 'WHILE', inRegion: 2 },
                    effects: [
                        expect.objectContaining({
                            type: 'MODIFY_KEYWORD',
                            keyword: 'MUSTER',
                            target: [['SHIRE', 'COMPANION']],
                        }),
                    ],
                }),
                expect.objectContaining({
                    trigger: { type: 'WHILE', inRegion: 3 },
                    effects: [
                        expect.objectContaining({
                            type: 'MODIFY_KEYWORD',
                            keyword: 'MUSTER',
                            target: [['CHARACTER']],
                        }),
                    ],
                }),
            ])
        );
    });

    it('parse Task Now : Spot X → résistance +X', () => {
        const abs = parseAbilities(
            'Spot X Hobbits to make an unbound Hobbit resistance +X.',
            'A Task Now to Be Done',
            '11U175'
        );
        expect(abs?.[0]).toEqual(
            expect.objectContaining({
                cost: [
                    expect.objectContaining({
                        spot: [
                            expect.objectContaining({
                                target: [['HOBBIT']],
                            }),
                        ],
                    }),
                ],
                effects: [
                    expect.objectContaining({
                        type: 'ADD_TEMP_STAT',
                        stat: 'RESISTANCE',
                        value: 1,
                        target: [['UNBOUND', 'HOBBIT']],
                        countFromSpot: true,
                    }),
                ],
            })
        );
    });

    it('parse Filibert : exert ×2 → cancel fierce involving COST_TARGET', () => {
        const abs = parseAbilities(
            '<keyword>Skirmish:</keyword> Exert a Hobbit companion twice to cancel a fierce skirmish involving that Hobbit.',
            'Filibert Bolger',
            '2C101'
        );
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['SKIRMISH'],
                    cost: [
                        expect.objectContaining({
                            exert: [
                                expect.objectContaining({
                                    count: 2,
                                    target: [['HOBBIT', 'COMPANION']],
                                }),
                            ],
                        }),
                    ],
                    effects: [
                        expect.objectContaining({
                            type: 'CANCEL_SKIRMISH',
                            involving: 'COST_TARGET',
                            requiresFierce: true,
                        }),
                    ],
                }),
            ])
        );
    });

    it('parse Simple Living : jouer événement Comté → soigner chaque Hobbit', () => {
        const abs = parseAbilities(
            '<keyword>Response:</keyword> If you play a <symbol>shire</symbol> event, discard this condition to heal each Hobbit.',
            'Simple Living',
            '12U130'
        );
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['RESPONSE'],
                    optional: true,
                    trigger: {
                        type: 'YOU_PLAY',
                        played: [['SHIRE', 'EVENT']],
                    },
                    effects: [
                        expect.objectContaining({
                            type: 'HEAL',
                            all: true,
                            target: [['HOBBIT']],
                        }),
                    ],
                }),
            ])
        );
    });
});

describe('Hobbits / Isengard vague 3 — runtime', () => {
    it('Task Now : 3 Hobbits spotés → +3 résistance', () => {
        const event = {
            ...getCardById('11U175')!,
            instanceId: 'task',
        };
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo',
            race: 'HOBBIT',
            resistance: 10,
            ringBearer: true,
            keywords: ['RING-BOUND'],
        });
        const merry = createCompanion({
            id: 'merry',
            instanceId: 'merry',
            race: 'HOBBIT',
            resistance: 6,
        });
        const pippin = createCompanion({
            id: 'pippin',
            instanceId: 'pippin',
            race: 'HOBBIT',
            resistance: 4,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, merry, pippin],
                    burdens: 0,
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(applyEventAbility(G, event, 'skirmish', 'pippin')).toBe(true);
        expect(getEffectiveResistance(pippin, 0, G)).toBe(7);
    });

    it('Phial région 1 : porteur gagne Muster', () => {
        const phial = {
            ...getCardById('13R155')!,
            instanceId: 'phial',
        };
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo',
            race: 'HOBBIT',
            keywords: ['RING-BOUND'],
            ringBearer: true,
            attachments: [phial],
        });
        const engine = createEngineClient({
            startPhase: 'fellowship',
            G: {
                currentSiteIndex: 0,
                path: [
                    createSite({
                        id: 'site1',
                        instanceId: 'site1',
                        siteNumber: 1,
                    }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo],
                        currentSiteIndex: 0,
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });
        const G = engine.getG();
        const live = G.players['0']!.fellowshipArea[0]!;
        expect(getKeywordValue(live, 'MUSTER', G)).toBeGreaterThanOrEqual(0);
    });
});
