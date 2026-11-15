import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import { canCardTakeWound } from '../logic/sites';
import { stackCardOnHost } from '../logic/cardStack';
import type { Ability, CardState } from '../types';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

const DESERTION_TEXT =
    'To play, spot an <symbol>isengard</symbol> Man. Plays on a companion (except the Ring-bearer). <keyword>Assignment:</keyword> Assign an <symbol>isengard</symbol> minion with less strength than bearer to skirmish bearer. Discard this condition.';

const TWISTED_TEXT =
    'Each time a companion or ally loses a skirmish involving an <symbol>isengard</symbol> Man, you may spot a possession to stack that possession here.';

const GRIMA_TEXT =
    "<keyword>Maneuver:</keyword> Exert Gríma and spot an unbound companion bearing 3 or more cards to return each Free Peoples card that companion bears to its owner's hand.";

const PALLANDO_TEXT =
    'At the start of the maneuver phase, you may exert a Wizard to make this condition a <keyword>fierce</keyword> Wizard minion until the start of the regroup phase that has 10 strength and 1 vitality, and cannot take wounds or bear other cards. This card is still a condition.';

const RADAGAST_TEXT =
    '<keyword>Aid</keyword> - <symbol>twilight2</symbol>. While you can spot 2 <symbol>gandalf</symbol> companions, minions skirmishing bearer do not gain strength bonuses from possessions.';

describe('Hobbits / Isengard vague 9 — parse', () => {
    it('Desertion : FORCE_ASSIGN séide plus faible → porteur + défausse', () => {
        expect(parseAbilities(DESERTION_TEXT, 'Desertion', '6U61')).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['ASSIGNMENT'],
                    cost: [
                        expect.objectContaining({
                            spot: [
                                expect.objectContaining({
                                    target: [['ISENGARD', 'MINION']],
                                    mode: 'DESIGNATION',
                                    lessStrengthThanBearer: true,
                                }),
                            ],
                        }),
                    ],
                    effects: [
                        {
                            type: 'FORCE_ASSIGN',
                            minion: 'COST_TARGET',
                            companion: 'BEARER',
                        },
                        { type: 'DISCARD', target: 'SELF' },
                    ],
                }),
            ])
        );
    });

    it('Twisted Tales : LOSES_SKIRMISH → empiler une possession', () => {
        expect(parseAbilities(TWISTED_TEXT, 'Twisted Tales', '6U75')).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['RESPONSE'],
                    optional: true,
                    trigger: expect.objectContaining({
                        type: 'LOSES_SKIRMISH',
                        loser: [
                            ['COMPANION'],
                            ['ALLY'],
                        ],
                        involving: [['ISENGARD', 'MAN']],
                    }),
                    effects: [
                        {
                            type: 'STACK_ON_SELF',
                            from: 'PLAY',
                            target: [['POSSESSION']],
                        },
                    ],
                }),
            ])
        );
    });

    it('Gríma Wormtongue : retourner attachements FP', () => {
        expect(parseAbilities(GRIMA_TEXT, 'Gríma', '4R154')).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['MANEUVER'],
                    cost: [
                        expect.objectContaining({
                            exert: [{ count: 1, target: 'SELF' }],
                            spot: [
                                expect.objectContaining({
                                    target: [['UNBOUND', 'COMPANION']],
                                    mode: 'DESIGNATION',
                                    minAttachments: 3,
                                }),
                            ],
                        }),
                    ],
                    effects: [
                        {
                            type: 'RETURN_ATTACHMENTS_TO_HAND',
                            host: 'COST_TARGET',
                            filter: [['FREE_PEOPLES']],
                        },
                    ],
                }),
            ])
        );
    });

    it('Pallando Deceived : début manœuvre → BECOME_MINION Wizard', () => {
        expect(
            parseAbilities(PALLANDO_TEXT, 'Pallando Deceived', '13U79')
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['START_OF_MANEUVER'],
                    optional: true,
                    effects: [
                        expect.objectContaining({
                            type: 'BECOME_MINION',
                            strength: 10,
                            vitality: 1,
                            keywords: ['FIERCE'],
                            race: 'WIZARD',
                            cannotTakeWounds: true,
                            cannotBearCards: true,
                        }),
                    ],
                }),
            ])
        );
    });

    it('Radagast : While 2 gandalf → SUPPRESS_POSSESSION_STRENGTH', () => {
        expect(parseAbilities(RADAGAST_TEXT, 'Radagast', '13R38')).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: {
                        type: 'WHILE',
                        spot: [
                            {
                                count: 2,
                                target: [['GANDALF', 'COMPANION']],
                            },
                        ],
                    },
                    effects: [
                        {
                            type: 'SUPPRESS_POSSESSION_STRENGTH',
                            target: 'SKIRMISHING',
                        },
                    ],
                }),
            ])
        );
    });
});

describe('Hobbits / Isengard vague 9 — runtime', () => {
    it('Pallando : animation + immunité blessures', () => {
        const abs =
            parseAbilities(PALLANDO_TEXT, 'Pallando Deceived', '13U79') || [];
        const ability = abs.find((a) =>
            a.effects?.some((e) => e.type === 'BECOME_MINION')
        ) as Ability;
        const card: CardState = {
            ...createCard({
                id: '13U79',
                type: 'CONDITION',
                kind: 'SHADOW',
                instanceId: 'pallando-dec',
            }),
            abilities: [ability],
        };
        const G = createGameState({
            battlefield: [],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', { supportArea: [card] }),
            },
        });
        expect(applyAbilityEffect(G, card, ability)).toBe(true);
        expect(G.battlefield[0]?.type).toBe('MINION');
        expect(G.battlefield[0]?.race).toBe('WIZARD');
        expect(G.battlefield[0]?.animatedMinion?.cannotTakeWounds).toBe(true);
        expect(canCardTakeWound(G, G.battlefield[0]!)).toBe(false);
    });

    it('Twisted Tales : empile une possession détachée', () => {
        const host = createCard({
            id: '6U75',
            type: 'CONDITION',
            kind: 'SHADOW',
            instanceId: 'twisted',
        });
        const companion = createCompanion({
            id: 'sam',
            instanceId: 'sam',
            attachments: [],
        });
        const sword = createCard({
            id: 'sword',
            type: 'POSSESSION',
            kind: 'FREE_PEOPLE',
            instanceId: 'sword',
            strength: 2,
        });
        companion.attachments = [sword];
        sword.attachedTo = companion.id;
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [companion],
                }),
                '1': createPlayerState('1', { supportArea: [host] }),
            },
        });
        expect(stackCardOnHost(G, host, sword, 'PLAY', '1')).toBe(true);
        expect(companion.attachments).toHaveLength(0);
        expect(host.stacked).toHaveLength(1);
        expect(host.stacked?.[0]?.instanceId).toBe('sword');
    });

    it('Radagast : possession n’ajoute plus de force au séide', () => {
        const radagast = createCard({
            id: '13R38',
            type: 'FOLLOWER',
            kind: 'FREE_PEOPLE',
            culture: 'GANDALF',
            instanceId: 'rad',
            abilities: parseAbilities(
                RADAGAST_TEXT,
                'Radagast',
                '13R38'
            ) as Ability[],
        });
        const gandalf = createCompanion({
            id: '1R72',
            instanceId: 'gandalf',
            culture: 'GANDALF',
            race: 'WIZARD',
            attachments: [radagast],
        });
        radagast.attachedTo = gandalf.id;
        const gandalf2 = createCompanion({
            id: '0P53',
            instanceId: 'radagast-brown',
            culture: 'GANDALF',
            race: 'WIZARD',
            title: 'Radagast',
        });
        const weapon = createCard({
            id: 'axe',
            type: 'POSSESSION',
            kind: 'SHADOW',
            instanceId: 'axe',
            strength: 3,
            subtype: 'HAND-WEAPON',
        });
        const minion = createMinion({
            id: 'orc',
            instanceId: 'orc',
            strength: 8,
            attachments: [weapon],
        });
        weapon.attachedTo = minion.id;
        const G = createGameState({
            activeSkirmishId: 'sk1',
            skirmishes: [
                {
                    id: 'sk1',
                    companionId: gandalf.instanceId!,
                    minionIds: [minion.instanceId!],
                },
            ],
            battlefield: [minion],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [gandalf, gandalf2],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(getCalculatedStrength(G, minion)).toBe(8);
    });

    it('cartes converties : abilities présentes', () => {
        for (const id of ['6U61', '6U75', '4R154', '13U79', '13R38']) {
            const card = getCardById(id);
            expect(card?.abilities?.length, id).toBeGreaterThan(0);
        }
    });
});
