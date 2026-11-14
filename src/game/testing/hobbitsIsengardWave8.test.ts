import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import { playCardFromDeckOrDiscard } from '../logic/playFromOutOfPlay';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

const FELL_TEXT =
    '**Shadow:** Exert Saruman to play an <symbol>isengard</symbol> weather condition from your discard pile.  Its twilight cost is -2.';

const SARUMAN_TTT_TEXT = `Saruman may not take wounds during the archery phase and may not be assigned to a skirmish.
When you play Saruman, you may discard a condition.
**Shadow:** Exert Saruman to play Saruman’s Staff from your discard pile.`;

const THRONE_TEXT = `Each time you play Saruman, spot a minion. That minion is **fierce** until the start of the regroup phase.
Each Wizard is strength +3 and damage +1.`;

const STAFF_TEXT = `Plays on Saruman. He is <keyword>fierce.</keyword> and <keyword>damage +1.</keyword> 
**Maneuver:** Make the first sentence of Saruman’s game text not apply until the regroup phase.`;

describe('Hobbits / Isengard vague 8 — parse', () => {
    it('Fell Voice : exert Saruman → weather défausse (−2 crépuscule)', () => {
        const abs = parseAbilities(FELL_TEXT, 'A Fell Voice on the Air', '3R52');
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['SHADOW'],
                    effects: [
                        expect.objectContaining({
                            type: 'PLAY_FROM_DECK_OR_DISCARD',
                            from: 'DISCARD',
                            twilightReduce: 2,
                            target: [['ISENGARD', 'WEATHER', 'CONDITION']],
                        }),
                    ],
                }),
            ])
        );
    });

    it('Saruman TTT : when-played défausse + Staff depuis défausse', () => {
        const abs = parseAbilities(SARUMAN_TTT_TEXT, 'Saruman', '4R173');
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    optional: true,
                    trigger: { type: 'WHEN_PLAYED' },
                    effects: [
                        expect.objectContaining({
                            type: 'DISCARD',
                            target: [['CONDITION']],
                        }),
                    ],
                }),
                expect.objectContaining({
                    phases: ['SHADOW'],
                    effects: [
                        expect.objectContaining({
                            type: 'PLAY_FROM_DECK_OR_DISCARD',
                            from: 'DISCARD',
                            target: [["Saruman's Staff"]],
                        }),
                    ],
                }),
            ])
        );
    });

    it('Throne : chaque Magicien force +3 et damage +1', () => {
        const abs = parseAbilities(THRONE_TEXT, 'Throne of Isengard', '17R39');
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WHILE' },
                    effects: expect.arrayContaining([
                        expect.objectContaining({
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 3,
                            target: [['WIZARD']],
                        }),
                        expect.objectContaining({
                            type: 'MODIFY_KEYWORD',
                            keyword: 'DAMAGE +1',
                            target: [['WIZARD']],
                        }),
                    ]),
                }),
            ])
        );
    });

    it('Staff : manœuvre ignore les restrictions du porteur', () => {
        const abs = parseAbilities(STAFF_TEXT, "Saruman's Staff", '4R174');
        expect(abs).toEqual([
            expect.objectContaining({
                phases: ['MANEUVER'],
                effects: [
                    expect.objectContaining({
                        type: 'SUPPRESS_CHARACTER_PLAY_RESTRICTIONS',
                        target: 'BEARER',
                        expiresAtPhase: 'REGROUP',
                    }),
                ],
            }),
        ]);
    });
});

describe('Hobbits / Isengard vague 8 — runtime', () => {
    it('Throne : Gandalf force +3 et damage +1', () => {
        const whileAbs =
            getCardById('17R39')?.abilities ||
            parseAbilities(THRONE_TEXT, 'Throne of Isengard', '17R39') ||
            [];
        const throne = createCard({
            id: '17R39',
            instanceId: 'throne',
            kind: 'SHADOW',
            type: 'CONDITION',
            culture: 'ISENGARD',
            abilities: whileAbs as never,
        });
        const gandalf = createCompanion({
            id: '1R72',
            instanceId: 'gandalf',
            title: 'Gandalf',
            race: 'WIZARD',
            strength: 7,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [gandalf],
                }),
                '1': createPlayerState('1', {
                    supportArea: [throne],
                }),
            },
        });
        expect(getCalculatedStrength(G, gandalf)).toBe(10);
        expect(getKeywordValue(gandalf, 'DAMAGE', G)).toBe(1);
    });

    it('Fell Voice : joue weather depuis défausse avec −2 crépuscule', () => {
        const weather = createCard({
            id: 'weather-test',
            instanceId: 'weather',
            kind: 'SHADOW',
            type: 'CONDITION',
            culture: 'ISENGARD',
            keywords: ['WEATHER'],
            twilightCost: 3,
            title: 'Test Weather',
        });
        const G = createGameState({
            twilightPool: 2,
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    discard: [weather],
                }),
            },
        });
        const played = playCardFromDeckOrDiscard(
            G,
            '1',
            'weather',
            [['ISENGARD', 'WEATHER', 'CONDITION']],
            'shadow',
            null,
            'DISCARD',
            2
        );
        expect(played).toBeTruthy();
        expect(G.twilightPool).toBe(1);
        expect(
            G.players['1']?.supportArea?.some((c) => c.instanceId === 'weather')
        ).toBe(true);
    });

    it('Staff manœuvre : Saruman redevient assignable', () => {
        const staffCard = getCardById('4R174')!;
        const maneuver = (staffCard.abilities || []).find((a) =>
            a.phases?.includes('MANEUVER')
        );
        expect(maneuver).toBeTruthy();

        const saruman = createMinion({
            id: '4R173',
            instanceId: 'saruman',
            title: 'Saruman',
            race: 'WIZARD',
            cannotBeAssignedToSkirmish: true,
            cannotTakeArcheryWounds: true,
            attachments: [
                {
                    ...staffCard,
                    instanceId: 'staff',
                },
            ],
        });
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1'),
            },
            battlefield: [saruman],
        });

        expect(
            applyAbilityEffect(G, saruman.attachments![0]!, maneuver as never)
        ).toBe(true);
        expect(saruman.suppressCharacterPlayRestrictionsUntil).toBe('REGROUP');
    });
});
