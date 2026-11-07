import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';

describe('Nazgûl inertes — parse', () => {
    it('1U233 Nelya : exert + replace site adverse même numéro', () => {
        expect(
            parseAbilities(
                '<keyword>Fierce.</keyword>  <br><keyword>Shadow:</keyword> Exert Úlairë Nelya and spot an opponent’s site to replace it with your site of the same number.',
                'Úlairë Nelya',
                '1U233'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['SHADOW'],
                    cost: [
                        {
                            exert: [{ count: 1, target: 'SELF' }],
                        },
                    ],
                    effects: [
                        {
                            type: 'REPLACE_SITE',
                            scope: 'OPPONENT',
                            from: 'SITES_DECK',
                        },
                    ],
                }),
            ])
        );
    });

    it('12U180 Toldëa : when play may exert → take wraith event', () => {
        expect(
            parseAbilities(
                '<keyword>Fierce.</keyword> \nWhen you play Úlairë Toldëa, you may exert him to take a <symbol>wraith</symbol> event from your discard pile into hand.',
                'Úlairë Toldëa',
                '12U180'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WHEN_PLAYED' },
                    optional: true,
                    cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
                    effects: [
                        {
                            type: 'TAKE_FROM_DISCARD',
                            target: [['WRAITH', 'EVENT']],
                        },
                    ],
                }),
            ])
        );
    });

    it('7U178 Foul Clutches : discard 3 → Nazgûl +3', () => {
        expect(
            parseAbilities(
                'Discard 3 cards from hand to make a Nazgûl strength +3.',
                'Foul Clutches',
                '7U178'
            )
        ).toEqual([
            expect.objectContaining({
                phases: [],
                cost: [{ discardFromHand: 3 }],
                effects: [
                    expect.objectContaining({
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 3,
                        target: [['NAZGÛL']],
                        expiresAtPhase: 'SKIRMISH',
                    }),
                ],
            }),
        ]);
    });

    it('1R221 Pale Blade : wins → exert bearer → discard FP condition', () => {
        expect(
            parseAbilities(
                'Bearer must be The Witch-king.  <br>He is <keyword>damage +1.</keyword> <keyword>Response:</keyword> If The Witch-king wins a skirmish, exert him to discard a Free Peoples condition.',
                'The Pale Blade',
                '1R221'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['RESPONSE'],
                    optional: true,
                    trigger: {
                        type: 'WINS_SKIRMISH',
                        winner: 'BEARER',
                    },
                    cost: [
                        {
                            exert: [{ count: 1, target: 'BEARER' }],
                        },
                    ],
                    effects: [
                        {
                            type: 'DISCARD',
                            count: 1,
                            target: [['FREE_PEOPLES', 'CONDITION']],
                        },
                    ],
                    source: 'ATTACHMENT',
                }),
            ])
        );
    });

    it('6R85 Dol Guldur : while Toldëa wins → FP discard possession or condition', () => {
        expect(
            parseAbilities(
                'Bearer must be a Nazgûl. While bearer is Úlairë Toldëa, each time he wins a skirmish the Free Peoples player must discard a Free Peoples possession or Free Peoples condition.',
                'Sword of Dol Guldur',
                '6R85'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['RESPONSE'],
                    requiresBearerTitles: ['Úlairë Toldëa'],
                    trigger: {
                        type: 'WINS_SKIRMISH',
                        winner: 'BEARER',
                    },
                    effects: [
                        {
                            type: 'DISCARD',
                            count: 1,
                            target: [
                                ['FREE_PEOPLES', 'POSSESSION'],
                                ['FREE_PEOPLES', 'CONDITION'],
                            ],
                            chooser: 'FREE_PEOPLE',
                        },
                    ],
                    source: 'ATTACHMENT',
                }),
            ])
        );
    });
});
