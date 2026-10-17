import { describe, expect, it } from 'vitest';
import {
    parseAbilities,
    parseSiteAbilities,
    parseToPlayConditions,
} from '../../../scripts/convert/parsers';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';
import type { Ability } from '../types';

describe('parseAbilities — Spot named → make + damage (Still Sharp)', () => {
    it('Still Sharp : spot Fragments de Narsil → compagnon gondor +3 et Damage +1', () => {
        const text =
            '<keyword>Skirmish:</keyword> Spot The Shards of Narsil to make a <symbol>gondor</symbol> companion strength +3 and **damage +1.**';
        expect(parseAbilities(text, 'Still Sharp', '3U46')).toEqual([
            {
                id: '3U46:0',
                phases: ['SKIRMISH'],
                cost: [
                    {
                        spot: [
                            {
                                count: 1,
                                target: [['The Shards of Narsil']],
                            },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 3,
                        target: [['GONDOR', 'COMPANION']],
                        expiresAtPhase: 'SKIRMISH',
                    },
                    {
                        type: 'ADD_TEMP_KEYWORD',
                        keyword: 'DAMAGE +1',
                        target: [['GONDOR', 'COMPANION']],
                        expiresAtPhase: 'SKIRMISH',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /Spot The Shards of Narsil to make a gondor companion/i
                ),
            },
        ]);
    });
});

describe('parseAbilities — Heal for each spot (Unharmed)', () => {
    it('Unharmed : heal Hobbit for each minion spotted', () => {
        expect(
            parseAbilities(
                'Heal a Hobbit for each minion you spot.',
                'Unharmed',
                '11S176'
            )
        ).toEqual([
            {
                id: '11S176:0',
                phases: [],
                cost: [{ spot: [{ count: 1, target: [['MINION']] }] }],
                effects: [
                    {
                        type: 'HEAL',
                        multiFromSpot: true,
                        target: [['HOBBIT']],
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /Heal a Hobbit for each minion you spot/i
                ),
            },
        ]);
    });
});

describe('parseSiteAbilities — Each unwounded → defender (Window on the West)', () => {
    it('Window on the West : each unwounded gondor Man defender +1', () => {
        const text =
            '<keyword>Underground.</keyword> Each unwounded <symbol>gondor</symbol> Man is **defender +1. **';
        expect(parseSiteAbilities(text, '11S265')).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE' },
                effects: [
                    {
                        type: 'MODIFY_KEYWORD',
                        keyword: 'DEFENDER +1',
                        target: [['GONDOR', 'UNWOUNDED', 'MAN']],
                    },
                ],
            }),
        ]);
    });
});

describe('Window on the West — runtime', () => {
    const windowAbility: Ability = {
        id: '11S265:0',
        phases: [],
        trigger: { type: 'WHILE' },
        cost: [],
        effects: [
            {
                type: 'MODIFY_KEYWORD',
                keyword: 'DEFENDER +1',
                target: [['GONDOR', 'UNWOUNDED', 'MAN']],
            },
        ],
        source: 'SELF',
    };

    it('accorde defender +1 aux Hommes Gondor sans blessure sur le site', () => {
        const site = createSite({
            id: '11S265',
            name: 'Window on the West',
            keywords: ['UNDERGROUND'],
            abilities: [windowAbility],
        });
        const boromir = createCompanion({
            id: 'boromir',
            title: 'Boromir',
            culture: 'GONDOR',
            race: 'MAN',
            wounds: 0,
        });
        const wounded = createCompanion({
            id: 'faramir',
            title: 'Faramir',
            culture: 'GONDOR',
            race: 'MAN',
            wounds: 1,
        });
        const hobbit = createCompanion({
            id: 'sam',
            title: 'Sam',
            culture: 'SHIRE',
            race: 'HOBBIT',
        });

        const path = Array(9).fill(null) as ReturnType<typeof createSite>[];
        path[0] = site;

        const G = createGameState({
            path,
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [boromir, wounded, hobbit],
                }),
            },
        });

        expect(getKeywordValue(boromir, 'DEFENDER', G)).toBe(1);
        expect(getKeywordValue(wounded, 'DEFENDER', G)).toBe(-1);
        expect(getKeywordValue(hobbit, 'DEFENDER', G)).toBe(-1);
    });
});

describe('parseAbilities — deck gaps batch 2 (Noble Leaders / Gandalf / Promise / Shadowfax)', () => {
    it('Noble Leaders : place per named + remove-or-discard make', () => {
        const text =
            'When you play this condition, place a <symbol>gondor</symbol> token here for each of the following characters you can spot: Aragorn, Boromir, Denethor or Faramir. \n<keyword>Skirmish:</keyword> Remove a token from here or discard this condition to make a <symbol>gondor</symbol> companion strength +1 and <keyword>Damage +1.</keyword>';
        const abs = parseAbilities(text, 'Noble Leaders', '7R112');
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WHEN_PLAYED' },
                    effects: [
                        expect.objectContaining({
                            type: 'PLACE_CULTURE_TOKEN',
                            culture: 'GONDOR',
                            count: 1,
                            target: 'SELF',
                            perSpot: {
                                target: [
                                    ['Aragorn'],
                                    ['Boromir'],
                                    ['Denethor'],
                                    ['Faramir'],
                                ],
                            },
                        }),
                    ],
                }),
                expect.objectContaining({
                    phases: ['SKIRMISH'],
                    cost: [
                        {
                            removeCultureTokens: {
                                culture: 'ANY',
                                count: 1,
                                from: 'SELF',
                            },
                        },
                    ],
                }),
                expect.objectContaining({
                    phases: ['SKIRMISH'],
                    cost: [
                        {
                            discardFromPlay: [
                                { count: 1, target: 'SELF' },
                            ],
                        },
                    ],
                }),
            ])
        );
        const makeAb = abs?.find(
            (a) =>
                a.phases?.includes('SKIRMISH') &&
                a.cost?.[0]?.removeCultureTokens
        );
        expect(makeAb?.effects).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'ADD_TEMP_STAT',
                    stat: 'STRENGTH',
                    value: 1,
                    target: [['GONDOR', 'COMPANION']],
                }),
                expect.objectContaining({
                    type: 'ADD_TEMP_KEYWORD',
                    keyword: 'DAMAGE +1',
                    target: [['GONDOR', 'COMPANION']],
                }),
            ])
        );
    });

    it('Gandalf Returned : when-played play possession + wins reinforce', () => {
        const text =
            'When you play Gandalf (except in your starting fellowship), you may play a <symbol>gandalf</symbol> possession on him from your draw deck or discard pile. \nEach time Gandalf wins a skirmish, you may reinforce a Free Peoples token.';
        const abs = parseAbilities(text, 'Gandalf', '17R17');
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: {
                        type: 'WHEN_PLAYED',
                        exceptStartingFellowship: true,
                    },
                    optional: true,
                    effects: [
                        {
                            type: 'PLAY_FROM_DECK_OR_DISCARD',
                            target: [['GANDALF', 'POSSESSION']],
                            attachTo: 'SELF',
                        },
                    ],
                }),
                expect.objectContaining({
                    trigger: {
                        type: 'WINS_SKIRMISH',
                        winner: 'SELF',
                    },
                    optional: true,
                    effects: [
                        {
                            type: 'REINFORCE_CULTURE_TOKEN',
                            culture: 'FREE_PEOPLES',
                            count: 1,
                        },
                    ],
                }),
            ])
        );
    });

    it('Promise Keeping : takes a wound during skirmish involving gollum', () => {
        expect(
            parseAbilities(
                'Each time a companion takes a wound during a skirmish that involved a <symbol>gollum</symbol> minion, exert a companion.',
                'Promise Keeping',
                '8R24'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['RESPONSE'],
                trigger: {
                    type: 'TAKES_WOUND',
                    target: [['COMPANION']],
                    inSkirmish: true,
                    involving: [['GOLLUM', 'MINION']],
                },
                effects: [
                    {
                        type: 'EXERT',
                        count: 1,
                        target: [['COMPANION']],
                    },
                ],
            }),
        ]);
    });

    it('Shadowfax : start of skirmish each minion must exert', () => {
        expect(
            parseAbilities(
                'Bearer must be Gandalf. \nAt the start of each skirmish involving Gandalf, each minion skirmishing Gandalf must exert. \n<keyword>Skirmish:</keyword> Add a threat to make Gandalf strength +1.',
                'Shadowfax',
                '8R21'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: {
                        type: 'START_OF_SKIRMISH',
                        involving: [['Gandalf']],
                    },
                    effects: [
                        {
                            type: 'EXERT',
                            count: 1,
                            target: 'SKIRMISHING',
                            all: true,
                        },
                    ],
                    source: 'ATTACHMENT',
                }),
            ])
        );
    });

    it('Boromir Bearer of Council : contrainte RB + wins → discard skirmishing', () => {
        expect(
            parseAbilities(
                'While Boromir is the Ring-bearer, at the start of each skirmish involving him, add 3 burdens or wound him twice. \nEach time Boromir wins a skirmish, discard each minion he is skirmishing.',
                'Boromir',
                '9R+31'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: {
                        type: 'START_OF_SKIRMISH',
                        involving: 'SELF',
                        whileRingBearer: true,
                    },
                    effects: [
                        expect.objectContaining({
                            type: 'CHOOSE_ONE',
                            options: [
                                expect.objectContaining({
                                    effects: [
                                        {
                                            type: 'ADD_BURDENS',
                                            count: 3,
                                        },
                                    ],
                                }),
                                expect.objectContaining({
                                    effects: [
                                        {
                                            type: 'WOUND',
                                            count: 2,
                                            target: 'SELF',
                                        },
                                    ],
                                }),
                            ],
                        }),
                    ],
                }),
                expect.objectContaining({
                    trigger: {
                        type: 'WINS_SKIRMISH',
                        winner: 'SELF',
                    },
                    effects: [
                        {
                            type: 'DISCARD_ALL',
                            target: 'SKIRMISHING',
                        },
                    ],
                }),
            ])
        );
    });

    it('Mere of Dead Faces : Regroup exert Gollum/Sméagol → play next site', () => {
        expect(
            parseSiteAbilities(
                '**Marsh.** **Regroup:** Exert your Gollum or your Sméagol to play the fellowship\'s next site.',
                '11U246'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['REGROUP'],
                    effects: [
                        expect.objectContaining({ type: 'PLAY_NEXT_SITE' }),
                    ],
                }),
            ])
        );
    });

    it('Mad Thing : To assign → WHEN_ASSIGNED force +3 jusqu’au regroupement', () => {
        expect(
            parseAbilities(
                'To assign Gollum to a skirmish, the Free Peoples player must make Gollum strength +3 until the regroup phase or add a burden.',
                'Gollum',
                '10R21'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WHEN_ASSIGNED', by: 'FREE_PEOPLE' },
                    effects: [
                        expect.objectContaining({
                            type: 'ADD_TEMP_STAT',
                            stat: 'STRENGTH',
                            value: 3,
                            target: 'SELF',
                            expiresAtPhase: 'REGROUP',
                        }),
                    ],
                }),
            ])
        );
    });

    it('Sent Back : Skirmish discard self → discard minions skirmishing Wizard + dead pile', () => {
        expect(
            parseAbilities(
                '**Skirmish:** Discard this condition to discard each minion skirmishing a Wizard. Place that Wizard in your dead pile. \n**Fellowship** or **Regroup:** Play a Wizard (even if another copy of that Wizard is in your dead pile).',
                'Sent Back',
                '9R27'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['SKIRMISH'],
                    cost: [
                        {
                            discardFromPlay: [
                                { count: 1, target: 'SELF' },
                            ],
                        },
                    ],
                    effects: [
                        expect.objectContaining({
                            type: 'DISCARD_ALL',
                            target: [['MINION']],
                            skirmishingWith: [['WIZARD']],
                            thenDeadPileMatching: [['WIZARD']],
                        }),
                    ],
                }),
            ])
        );
    });

    it('Threatening Guide : force par menace + wins → add threat', () => {
        expect(
            parseAbilities(
                'Gollum is strength +1 for each threat you can spot. Each time Gollum wins a skirmish, you may add a threat.',
                'Gollum',
                '19P10'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WHILE' },
                    effects: [
                        expect.objectContaining({
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 1,
                            perThreats: true,
                        }),
                    ],
                }),
                expect.objectContaining({
                    trigger: {
                        type: 'WINS_SKIRMISH',
                        winner: 'SELF',
                    },
                    optional: true,
                    effects: [{ type: 'ADD_THREATS', count: 1 }],
                }),
            ])
        );
    });

    it('Ranger\'s Sword : while skirmishing Uruk-hai → bearer +2', () => {
        expect(
            parseAbilities(
                'Bearer must be Aragorn. While skirmishing an Uruk-hai, Aragorn is strength +2.',
                "Ranger's Sword",
                '4U132'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: {
                        type: 'WHILE',
                        skirmishing: { target: [['URUK-HAI']] },
                    },
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 2,
                            target: 'BEARER',
                        },
                    ],
                    source: 'ATTACHMENT',
                }),
            ])
        );
    });

    it('Fortress of Orthanc : +2 crépuscule par compagnon over 5', () => {
        expect(
            parseSiteAbilities(
                '**Battleground.** When the fellowship moves to the site, add <symbol>twilight2</symbol> for each companion over 5.',
                '11S241'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'MOVES_TO' },
                    effects: [
                        {
                            type: 'ADD_TWILIGHT',
                            count: 2,
                            perCompanionOver: 5,
                        },
                    ],
                }),
            ])
        );
    });

    it('Crags of Emyn Muil : leave regroup région 2 → wound each companion', () => {
        expect(
            parseSiteAbilities(
                '**Mountain.** If this site is in region 2 when the fellowship moves from it during the regroup phase, wound each companion.',
                '11S234'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: {
                        type: 'MOVES_FROM',
                        duringRegroup: true,
                        siteRegion: 2,
                    },
                    effects: [
                        {
                            type: 'WOUND',
                            count: 1,
                            all: true,
                            target: [['COMPANION']],
                        },
                    ],
                }),
            ])
        );
    });

    it('Anduin Banks : archerie ombre +2 par compagnon au-delà de 4 (sans doublon flat)', () => {
        const parsed = parseSiteAbilities(
            '**River.** The minion archery total is +2 for each companion in the fellowship over 4.',
            '11U227'
        );
        expect(parsed).toHaveLength(1);
        expect(parsed?.[0]).toEqual(
            expect.objectContaining({
                effects: [
                    {
                        type: 'MODIFY_ARCHERY_TOTAL',
                        side: 'SHADOW',
                        value: 2,
                        perCompanionOver: 4,
                    },
                ],
            })
        );
    });

    it('Let Her Deal With Them : spot Gollum|Sméagol = noms propres', () => {
        expect(
            parseToPlayConditions(
                'To play, spot Gollum or Sméagol. Bearer must be a minion.'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    spot: [
                        expect.objectContaining({
                            target: [['Gollum']],
                        }),
                    ],
                }),
                expect.objectContaining({
                    spot: [
                        expect.objectContaining({
                            target: [['Sméagol']],
                        }),
                    ],
                }),
            ])
        );
    });

    it('Glamdring : wins → remove burden ; Squad : resistance Damage', () => {
        expect(
            parseAbilities(
                'Bearer must be Gandalf.\nEach time Gandalf wins a skirmish, you may remove a burden.',
                'Glamdring',
                '11R35'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WINS_SKIRMISH', winner: 'BEARER' },
                    effects: [{ type: 'REMOVE_BURDENS', count: 1 }],
                    optional: true,
                }),
            ])
        );
        expect(
            parseAbilities(
                '**Damage +1.** While this minion is skirmishing a character who has resistance 4 or less, this minion is **Damage +1.**',
                'Squad of Uruk-hai',
                '11C202'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: {
                        type: 'WHILE',
                        skirmishing: {
                            target: [['CHARACTER']],
                            resistanceAtMost: 4,
                        },
                    },
                }),
            ])
        );
    });

    it('Faramir / Gimli Bearer : add burdens or threats', () => {
        expect(
            parseAbilities(
                'While Faramir is the Ring-bearer, at the start of each skirmish involving him, add 2 burdens or 2 threats.',
                'Faramir',
                '17R28'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: {
                        type: 'START_OF_SKIRMISH',
                        involving: 'SELF',
                        whileRingBearer: true,
                    },
                    effects: [
                        expect.objectContaining({
                            type: 'CHOOSE_ONE',
                            options: [
                                expect.objectContaining({
                                    effects: [
                                        { type: 'ADD_BURDENS', count: 2 },
                                    ],
                                }),
                                expect.objectContaining({
                                    effects: [
                                        { type: 'ADD_THREATS', count: 2 },
                                    ],
                                }),
                            ],
                        }),
                    ],
                }),
            ])
        );
    });

    it('Hidden Knowledge : reveal top 5 + threats + tokens', () => {
        expect(
            parseAbilities(
                'Spot a <symbol>gondor</symbol> companion to reveal the top 5 cards of an opponent’s draw deck. For each Shadow card revealed, add a threat. For each Free Peoples card revealed, place a <symbol>gondor</symbol> token on one of your conditions with a <symbol>gondor</symbol> token on it. Shuffle that draw deck.',
                'Hidden Knowledge',
                '7R104'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['FELLOWSHIP'],
                cost: [
                    {
                        spot: [
                            {
                                count: 1,
                                target: [['GONDOR', 'COMPANION']],
                            },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'REVEAL_OPPONENT_TOP',
                        count: 5,
                        perShadowCard: { type: 'ADD_THREATS', count: 1 },
                        perFreePeoplesCard: {
                            type: 'PLACE_CULTURE_TOKEN',
                            culture: 'GONDOR',
                            onConditionWithToken: true,
                        },
                    },
                ],
            }),
        ]);
    });

    it('Cruel Caradhras : Maneuver exert → adversaire choix RB / fardeau', () => {
        expect(
            parseAbilities(
                '<keyword>Maneuver:</keyword> Exert a <symbol>isengard</symbol> minion to make the opponent choose to either exert the Ring-bearer or add a burden.',
                'Cruel Caradhras',
                '1R124'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['MANEUVER'],
                    cost: [
                        {
                            exert: [
                                expect.objectContaining({
                                    count: 1,
                                    target: [['ISENGARD', 'MINION']],
                                }),
                            ],
                        },
                    ],
                    effects: [
                        expect.objectContaining({
                            type: 'CHOOSE_ONE',
                            chooser: 'OPPONENT',
                            options: [
                                expect.objectContaining({
                                    effects: [
                                        {
                                            type: 'EXERT',
                                            count: 1,
                                            target: [['RING-BEARER']],
                                        },
                                    ],
                                }),
                                expect.objectContaining({
                                    effects: [
                                        { type: 'ADD_BURDENS', count: 1 },
                                    ],
                                }),
                            ],
                        }),
                    ],
                }),
            ])
        );
    });

    it('Pelennor Flat : début Manœuvre choix FP fardeau / défausse 3', () => {
        expect(
            parseSiteAbilities(
                '**Plains.** At the start of the maneuver phase, the Free Peoples player must add a burden or discard 3 cards from hand.',
                '11S254'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['START_OF_MANEUVER'],
                    effects: [
                        expect.objectContaining({
                            type: 'CHOOSE_ONE',
                            chooser: 'FREE_PEOPLE',
                            options: [
                                expect.objectContaining({
                                    effects: [
                                        { type: 'ADD_BURDENS', count: 1 },
                                    ],
                                }),
                                expect.objectContaining({
                                    effects: [
                                        {
                                            type: 'DISCARD_FROM_HAND',
                                            count: 3,
                                        },
                                    ],
                                }),
                            ],
                        }),
                    ],
                }),
            ])
        );
    });

    it('Slippery Sneak : skirmish threats=vitality + regroup take from discard', () => {
        expect(
            parseAbilities(
                '<keyword>Skirmish:</keyword> Add a number of threats equal to the total vitality of the minions Sméagol is skirmishing to discard Sméagol. <keyword>Regroup:</keyword> Discard Sméagol to take a <symbol>gollum</symbol> minion from your discard pile into hand.',
                'Sméagol',
                '8R27'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['SKIRMISH'],
                cost: [
                    {
                        addThreatsEqualTo: 'SKIRMISHING_MINIONS_VITALITY',
                    },
                ],
                effects: [{ type: 'DISCARD', count: 1, target: 'SELF' }],
            }),
            expect.objectContaining({
                phases: ['REGROUP'],
                cost: [
                    {
                        discardFromPlay: [{ count: 1, target: 'SELF' }],
                    },
                ],
                effects: [
                    {
                        type: 'TAKE_FROM_DISCARD',
                        target: [['GOLLUM', 'MINION']],
                    },
                ],
            }),
        ]);
    });

    it('Shelob Eater of Light : when-played play possession from deck (pas attachTo SELF)', () => {
        const abs = parseAbilities(
            'When you play Shelob, you may play a <symbol>gollum</symbol> possession from your draw deck. Shelob is strength +3 for each minion stacked on a <symbol>gollum</symbol> possession.',
            'Shelob',
            '8R25'
        );
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WHEN_PLAYED' },
                    effects: [
                        {
                            type: 'PLAY_FROM_DECK_OR_DISCARD',
                            target: [['GOLLUM', 'POSSESSION']],
                            from: 'DECK',
                        },
                    ],
                }),
            ])
        );
        expect(abs?.[0]?.effects?.[0]).not.toHaveProperty('attachTo');
    });
});
